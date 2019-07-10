const mintAndDeposit = require('./actions/mintAndDeposit');
const { transfer } = require('./actions/transfer');
const exitUnspent = require('./actions/exitUnspent');
const minePeriod = require('./actions/minePeriod');
const chai = require("chai");
const chaiAsPromised = require("chai-as-promised");
chai.use(chaiAsPromised);

module.exports = async function(contracts, [node], accounts, wallet) {
    const minter = accounts[0].addr;
    const alice = accounts[7].addr;
    const alicePriv = accounts[7].privKey;
    const bob = accounts[6].addr;
    const amount = 10000000;

    console.log("╔══════════════════════════════════════════╗");
    console.log("║   Test: Exit after epochLength change    ║");
    console.log("║Steps:                                    ║");
    console.log("║1. Deposit to Alice                       ║");
    console.log("║2. Trasfer from Alice to Bob              ║");
    console.log("║3. Change epochLength                     ║");
    console.log("║4. Exit Bob                               ║");
    console.log("╚══════════════════════════════════════════╝");
    
    await mintAndDeposit(alice, amount, minter, contracts.token, contracts.exitHandler, node, wallet);
    
    console.log("------Transfer from Alice to Bob------");
    let txAmount = Math.round(amount/(2000))+ Math.round(100 * Math.random());
    await transfer(
        alice, 
        alicePriv, 
        bob, 
        txAmount, 
        node);
    console.log("Changing epochLength...");
    const data = await contracts.operator.interface.functions.setEpochLength.encode([2]);
    const gov = contracts.governance.connect(wallet.provider.getSigner(minter));
    let tx = await gov.propose(contracts.operator.address, data, { gasLimit: 2000000 });
    await tx.wait();

    // 2 weeks waiting period ;)
    tx = await gov.finalize({
      gasLimit: 2000000
    });
    await tx.wait();

    await minePeriod(node, accounts);
    console.log("------Exit Bob------");
    await exitUnspent(contracts, node, wallet, bob);

    console.log("╔══════════════════════════════════════════╗");
    console.log("║   Test: Exit after epochLength change    ║");
    console.log("║             Completed                    ║");                     
    console.log("╚══════════════════════════════════════════╝");
}
