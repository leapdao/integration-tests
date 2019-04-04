const { helpers, Tx, Outpoint, Period, Block } = require('leap-core');
const { bufferToHex } = require('ethereumjs-util');

const range = (s, e) =>
  Array.from(new Array(e - s + 1), (_, i) => i + s);

function sleep(ms){
  return new Promise(resolve => {
      setTimeout(resolve,ms);
  })
}

function getLog(noLog) {
  let log;
  if (noLog) {
    log = function(){};
  } else {
      log = console.log;
  }

  return log;
}

function formatHostname(hostname, port) {
  return 'http://'+hostname+':'+port;
}

async function makeTransfer(
  node,
  from,
  to,
  amount,
  color,
  privKey
) {

  let fromAddr = from.toLowerCase();
  to = to.toLowerCase();

  const utxos = await node.web3.getUnspent(from);
  const len = utxos.length;
  let balance = 0;
  let unspent = [];
  for (let i = 0; i < len; i++) {
    const utxo = utxos[i];
    const output = utxo.output;

    if (output.color === color) {
      balance += parseInt(output.value);
      unspent.push(utxo);
    }
  }

  if (balance < amount) {
    throw new Error('Insufficient balance');
  }

  const inputs = helpers.calcInputs(unspent, from, amount, color);
  const outputs = helpers.calcOutputs(
    unspent,
    inputs,
    fromAddr,
    to,
    amount,
    color
  );
  return Tx.transfer(inputs, outputs).signAll(privKey);
}

function makeTransferUxto(
  utxos,
  to,
  privKey
) {

  let from = utxos[0].output.address.toLowerCase();
  to = to.toLowerCase();
  const value = utxos.reduce((sum, unspent) => sum + unspent.output.value, 0);
  const color = utxos[0].output.color;

  return Tx.transferFromUtxos(utxos, from, to, value, color).signAll(privKey);
}

function advanceBlock(web3) {
  const id = Date.now();

  return new Promise((resolve, reject) => {
    web3.currentProvider.send(
      {
        jsonrpc: "2.0",
        method: "evm_mine",
        id: id + 1
      },
      (err, res) => {
        return err ? reject(err) : resolve(res);
      }
    );
  });
};

async function advanceBlocks(number, web3) {
  for (let i = 0; i < number; i++) {
    await advanceBlock(web3);
  }
};

module.exports = { sleep, formatHostname, makeTransfer, makeTransferUxto, getLog, advanceBlocks };
