const ethers = require('ethers');
const { awaitTx } = require('./helpers');
const mintAndDeposit = require('../tests/actions/mintAndDeposit');

module.exports = async function(contracts, nodes, accounts, wallet) {
  const alice = accounts[0].addr;

  let data = contracts.token.interface.functions.addMinter.encode([alice]);

  await awaitTx(contracts.governance.propose(contracts.token.address, data, { gasLimit: 2000000 }));
  await awaitTx(contracts.governance.finalize());
  await awaitTx(contracts.token.mint(alice, 500000000000));
  await awaitTx(contracts.token.approve(contracts.exitHandler.address, 500000000000));
  await awaitTx(contracts.token.approve(contracts.operator.address, 500000000000));

  for (let i = 0; i < nodes.length - 1; i++) {
    const validatorInfo = await nodes[i].getValidatorInfo();
    const overloadedSlotId = `${contracts.operator.address}00000000000000000000000${i}`;

    await awaitTx(
      contracts.governance.setSlot(
        overloadedSlotId,
        validatorInfo.ethAddress,
        `0x${validatorInfo.tendermintAddress}`,
        { gasLimit: 2000000 }
      )
    );

    await awaitTx(
      wallet.sendTransaction({
        to: validatorInfo.ethAddress,
        value: ethers.utils.parseEther('1'),
      })
    );
  }

  data = contracts.operator.interface.functions.setEpochLength.encode([nodes.length]);
  await awaitTx(
    contracts.governance.propose(
      contracts.operator.address, data,
      {
        gasLimit: 2000000
      }
    )
  );

  data = contracts.exitHandler.interface.functions.setExitDuration.encode([0]);
  await awaitTx(
    contracts.governance.propose(
      contracts.exitHandler.address, data,
      {
        gasLimit: 2000000
      }
    )
  );
  await awaitTx(contracts.governance.finalize({ gasLimit: 2000000 }));

  await mintAndDeposit(alice, 200000000000, alice, contracts.token, contracts.exitHandler, nodes[0], wallet);
}
