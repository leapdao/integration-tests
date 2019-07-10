const { helpers } = require('leap-core');
const { makeTransfer } = require('../../src/helpers');

module.exports = async (node, [{ addr, privKey }]) => {
  const currentBlock = Number((await node.getBlock('latest')).number);
  const [, lastBlockInPeriod] = helpers.periodBlockRange(currentBlock);

  for (let i = 0; i <= lastBlockInPeriod - currentBlock + 1; i++) {
    const transfer = await makeTransfer(
      node,
      addr,
      addr,
      1000,
      0,
      privKey
    );
    await node.sendTx(transfer);
    process.stdout.write(`\rMachinegunning till next period: ${currentBlock + i}/${lastBlockInPeriod + 1}`);
  }
  console.log();
}
