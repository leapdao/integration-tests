module.exports = async function(contracts, nodes, accounts, web3) {
  const alice = accounts[0].addr;

  let data = contracts.token.methods.addMinter(alice).encodeABI();
  await contracts.governance.methods.propose(contracts.token.options.address, data).send({
    from: alice, gas: 2000000
  });
  await contracts.governance.methods.finalize().send({ from: alice });
  await contracts.token.methods.mint(alice, 500000000000).send({from: alice});
  await contracts.token.methods.approve(contracts.exitHandler.options.address, 500000000000).send({from: alice});
  await contracts.token.methods.approve(contracts.operator.options.address, 500000000000).send({from: alice});

  for (let i = 0; i < nodes.length - 1; i += 1) {
    const validatorInfo = await nodes[i].web3.getValidatorInfo();
    const overloadedSlotId = contracts.operator.options.address + '00000000000000000000000' + i.toString();
    await contracts.governance.methods.setSlot(
      overloadedSlotId, validatorInfo.ethAddress, '0x' + validatorInfo.tendermintAddress
    ).send({ from: alice, gas: 2000000 });
  }

  for (let i = 0; i < nodes.length; i += 1) {
    const validatorInfo = await nodes[i].web3.getValidatorInfo();
    await web3.eth.sendTransaction({
      from: alice,
      to: validatorInfo.ethAddress,
      value: web3.utils.toWei('1', "ether")
    });
  }

  data = contracts.operator.methods.setEpochLength(nodes.length).encodeABI();
  await contracts.governance.methods.propose(contracts.operator.options.address, data).send({
    from: alice, gas: 2000000
  });
  data = contracts.exitHandler.methods.setExitDuration(0).encodeABI();
  await contracts.governance.methods.propose(contracts.exitHandler.options.address, data).send({
    from: alice, gas: 2000000
  });
  await contracts.governance.methods.finalize().send({ from: alice, gas: 2000000 });

  await contracts.exitHandler.methods.deposit(alice, 200000000000, 0).send({
    from: alice, gas: 2000000
  });
}