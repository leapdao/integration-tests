const { getLog } = require('../../src/helpers');
const waitForBalanceChange = require('./waitForBalanceChange');
require('chai').should();

module.exports = async function(alice, amount, minter, token, exitHandler, node, web3, noLog = false) {
  const log = getLog(noLog);
  const oldPlasmaBalance = await node.getBalance(alice);

  log(`Minting and depositing ${amount} tokens to account ${alice}...`);
  console.log('   Minting..');
  const balanceOrig = Number(await token.methods.balanceOf(alice).call());
  await token.methods.mint(alice, amount).send({from: minter});
  const balanceMint = Number(await token.methods.balanceOf(alice).call());
  console.log('   Approving..');
  await token.methods.approve(exitHandler.options.address, amount).send({from: alice});
  console.log('   Depositing..');
  await exitHandler.methods.deposit(alice, amount, 0).send({
    from: alice,
    gas: 2000000
  });
  const balanceFinal = Number(await token.methods.balanceOf(alice).call());
  
  const currentPlasmaBalance = await waitForBalanceChange(alice, oldPlasmaBalance, node, web3);
  currentPlasmaBalance.should.be.equal(oldPlasmaBalance + amount);
  
  balanceMint.should.be.equal(balanceOrig + amount);
  balanceFinal.should.be.equal(balanceOrig);
}
