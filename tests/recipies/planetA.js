const ethers = require('ethers');
const { bufferToHex, ripemd160 } = require('ethereumjs-util');
const { Tx } = require('leap-core');

const { mine, advanceBlocks } = require('../../src/helpers');
const mintAndDeposit = require('../actions/mintAndDeposit');

const ERC1949 = require('../../build/contracts/build/contracts/ERC1949.json');
const ERC20 = require('../../build/contracts/build/contracts/NativeToken.json');

let earthCode = '608060405234801561001057600080fd5b50600436106100445760e060020a60003504635ca740ab811461004957806394d615b514610086578063d4349137146100b8575b600080fd5b6100846004803603608081101561005f57600080fd5b50600160a060020a038135169060ff602082013516906040810135906060013561017f565b005b6100846004803603608081101561009c57600080fd5b5080359060ff6020820135169060408101359060600135610350565b610084600480360360c08110156100ce57600080fd5b813591602081013591810190606081016040820135602060020a8111156100f457600080fd5b82018360208201111561010657600080fd5b803590602001918460018302840111602060020a8311171561012757600080fd5b91908080601f016020809104026020016040519081016040528093929190818152602001838380828437600092019190915250929550508235935050600160a060020a036020830135811692604001351690506104cb565b6040805160008152602080820180845230905260ff861682840152606082018590526080820184905291517356711111111111111111111111111111111115679260019260a080820193601f1981019281900390910190855afa1580156101ea573d6000803e3d6000fd5b50505060206040510351600160a060020a031614151561024f576040805160e560020a62461bcd0281526020600482015260156024820152605b60020a740e6d2cedccae440c8decae640dcdee840dac2e8c6d02604482015290519081900360640190fd5b6040805160e060020a6370a08231028152306004820181905291518692600160a060020a0384169263a9059cbb9284916370a08231916024808301926020929190829003018186803b1580156102a457600080fd5b505afa1580156102b8573d6000803e3d6000fd5b505050506040513d60208110156102ce57600080fd5b50516040805160e060020a63ffffffff8616028152600160a060020a03909316600484015260248301919091525160448083019260209291908290030181600087803b15801561031d57600080fd5b505af1158015610331573d6000803e3d6000fd5b505050506040513d602081101561034757600080fd5b50505050505050565b604080516000815260208082018084523060a060020a890217905260ff861682840152606082018590526080820184905291517356711111111111111111111111111111111115679260019260a081810193601f1981019281900390910190855afa1580156103c3573d6000803e3d6000fd5b50505060206040510351600160a060020a0316141515610428576040805160e560020a62461bcd0281526020600482015260156024820152605b60020a740e6d2cedccae440c8decae640dcdee840dac2e8c6d02604482015290519081900360640190fd5b6040805160e060020a63a9059cbb02815273456111111111111111111111111111111111145660048201526024810186905290517312311111111111111111111111111111111111239163a9059cbb9160448083019260209291908290030181600087803b15801561049957600080fd5b505af11580156104ad573d6000803e3d6000fd5b505050506040513d60208110156104c357600080fd5b505050505050565b81816104d5610d8c565b604080516080810180835260e160020a6331a9108f029052608481018b905290518190600160a060020a03861690636352211e9060a480850191602091818703018186803b15801561052657600080fd5b505afa15801561053a573d6000803e3d6000fd5b505050506040513d602081101561055057600080fd5b5051600160a060020a03908116825260006020838101919091526040805160e060020a6337ebbc03028152600481018f905281519190940193928816926337ebbc03926024808301939192829003018186803b1580156105af57600080fd5b505afa1580156105c3573d6000803e3d6000fd5b505050506040513d60208110156105d957600080fd5b50518152600060209091015290506105ef610d8c565b604080516080810180835260e160020a6331a9108f0290526084810189905290518190600160a060020a03861690636352211e9060a480850191602091818703018186803b15801561064057600080fd5b505afa158015610654573d6000803e3d6000fd5b505050506040513d602081101561066a57600080fd5b5051600160a060020a03908116825260006020838101919091526040805160e060020a6337ebbc03028152600481018d905281519190940193928816926337ebbc03926024808301939192829003018186803b1580156106c957600080fd5b505afa1580156106dd573d6000803e3d6000fd5b505050506040513d60208110156106f357600080fd5b50518152600060209091015280518351919250600160a060020a0390811691161415610769576040805160e560020a62461bcd02815260206004820152601a60248201527f63616e206e6f742074726164652077697468206f6e6573656c66000000000000604482015290519081900360640190fd5b604082015173234111111111111111111111111111111111123490731231111111111111111111111111111111111123908b0363ffffffff16600081116107eb576040805160e560020a62461bcd02815260206004820152600b602482015260a860020a6a656d70747920747261646502604482015290519081900360640190fd5b66038d7ea4c680008102606086018190526703782dace9d900001015610851576040805160e560020a62461bcd0281526020600482015260106024820152608160020a6f34b73b30b634b21032b6b4b9b9b4b7b702604482015290519081900360640190fd5b6040850151602060020a90819004908d040360008111156108c857600181146108ba576040805160e560020a62461bcd0281526020600482015260106024820152608260020a6f1a5b98dbdc9c9958dd081cda59db985b02604482015290519081900360640190fd5b606482600160208901520491505b87600160a060020a03166336c9c4578f8f8f6040518463ffffffff1660e060020a0281526004018084815260200183815260200180602001828103825283818151815260200191508051906020019080838360005b8381101561093557818101518382015260200161091d565b50505050905090810190601f1680156109625780820380516001836020036101000a031916815260200191505b50945050505050600060405180830381600087803b15801561098357600080fd5b505af1158015610997573d6000803e3d6000fd5b505086516040805160e160020a636eb1769f028152600160a060020a039283166004820152306024820152905160009450918816925063dd62ed3e916044808301926020929190829003018186803b1580156109f257600080fd5b505afa158015610a06573d6000803e3d6000fd5b505050506040513d6020811015610a1c57600080fd5b50511160208681019190915286015180610a37575084602001515b610a415781610a46565b606482025b60608601819052604080870151815160e060020a63a983d43f028152600481018f90529201602483015251600160a060020a0389169163a983d43f91604480830192600092919082900301818387803b158015610aa257600080fd5b505af1158015610ab6573d6000803e3d6000fd5b50505060608601805166038d7ea4c68000908102909152600060408901528751930292600160a060020a038616915063a9059cbb90610af6858a8a610d1c565b6040518363ffffffff1660e060020a0281526004018083600160a060020a0316600160a060020a0316815260200182815260200192505050602060405180830381600087803b158015610b4857600080fd5b505af1158015610b5c573d6000803e3d6000fd5b505050506040513d6020811015610b7257600080fd5b50508451600160a060020a0385169063a9059cbb90610b9285898b610d1c565b6040518363ffffffff1660e060020a0281526004018083600160a060020a0316600160a060020a0316815260200182815260200192505050602060405180830381600087803b158015610be457600080fd5b505af1158015610bf8573d6000803e3d6000fd5b505050506040513d6020811015610c0e57600080fd5b5050606080860151908701516040805160e060020a63a9059cbb02815273456111111111111111111111111111111111145660048201529190920160248201529051600160a060020a0385169163a9059cbb9160448083019260209291908290030181600087803b158015610c8257600080fd5b505af1158015610c96573d6000803e3d6000fd5b505050506040513d6020811015610cac57600080fd5b50508451865160208089015181890151604080519215158352901515928201929092528151600160a060020a0394851694909316927f2d476ce15822194d3b3e6deb5bb7edd748b0f8ac84d26685f9d2991220c40b4f929181900390910190a35050505050505050505050505050565b6000839050816060015183606001511115610d375750600a83025b816060015183606001511415610d82578383606001511415610d595750600383025b816020015115158360200151151514158015610d7757506040830151155b15610d825750600a83025b6032029392505050565b6040805160808101825260008082526020820181905291810182905260608101919091529056fea165627a7a72305820c35f51757c326ca289e2fcdcab7cbde4fd154e8dca30256194a96be34a6977770029';

let airCode = '608060405234801561001057600080fd5b50600436106100445760e060020a600035046309f257ef81146100495780630aef446d1461008c5780635ca740ab146100c8575b600080fd5b61008a600480360360a081101561005f57600080fd5b50803590602081013560ff169060408101359060608101359060800135600160a060020a0316610103565b005b61008a600480360360808110156100a257600080fd5b50803590600160a060020a03602082013581169160408101359160609091013516610274565b61008a600480360360808110156100de57600080fd5b50600160a060020a038135169060ff6020820135169060408101359060600135610527565b604080516000815260208082018084523060a060020a8a0217905260ff871682840152606082018690526080820185905291517308ebef2a47e054d8c4b5be934e12ffc796bb0b2d9260019260a081810193601f1981019281900390910190855afa158015610176573d6000803e3d6000fd5b50505060206040510351600160a060020a03161415156101db576040805160e560020a62461bcd0281526020600482015260156024820152605b60020a740e6d2cedccae440c8decae640dcdee840dac2e8c6d02604482015290519081900360640190fd5b6040805160e060020a63a9059cbb028152600160a060020a038316600482015260248101879052905173f64ffbc4a69631d327590f4151b79816a193a8c69163a9059cbb9160448083019260209291908290030181600087803b15801561024157600080fd5b505af1158015610255573d6000803e3d6000fd5b505050506040513d602081101561026b57600080fd5b50505050505050565b6000839050600081600160a060020a0316636352211e856040518263ffffffff1660e060020a0281526004018082815260200191505060206040518083038186803b1580156102c257600080fd5b505afa1580156102d6573d6000803e3d6000fd5b505050506040513d60208110156102ec57600080fd5b50516040805160e060020a6323b872dd028152600160a060020a0383166004820152306024820152604481018990529051919250731f89fb2199220a350287b162b9d0a330a2d2efad9182916323b872dd9160648083019260209291908290030181600087803b15801561035f57600080fd5b505af1158015610373573d6000803e3d6000fd5b505050506040513d602081101561038957600080fd5b50506040805160e060020a6337ebbc03028152600481018790529051600091600160a060020a038616916337ebbc0391602480820192602092909190829003018186803b1580156103d957600080fd5b505afa1580156103ed573d6000803e3d6000fd5b505050506040513d602081101561040357600080fd5b50519050600160a060020a03841663a983d43f8761042d8466038d7ea4c6800060028e02046106c5565b6040518363ffffffff1660e060020a0281526004018083815260200182815260200192505050600060405180830381600087803b15801561046d57600080fd5b505af1158015610481573d6000803e3d6000fd5b50506040805160e060020a63a9059cbb028152600160a060020a038916600482015260028c026024820152905173f64ffbc4a69631d327590f4151b79816a193a8c6935083925063a9059cbb916044808201926020929091908290030181600087803b1580156104f057600080fd5b505af1158015610504573d6000803e3d6000fd5b505050506040513d602081101561051a57600080fd5b5050505050505050505050565b6040805160008152602080820180845230905260ff861682840152606082018590526080820184905291517308ebef2a47e054d8c4b5be934e12ffc796bb0b2d9260019260a080820193601f1981019281900390910190855afa158015610592573d6000803e3d6000fd5b50505060206040510351600160a060020a03161415156105f7576040805160e560020a62461bcd0281526020600482015260156024820152605b60020a740e6d2cedccae440c8decae640dcdee840dac2e8c6d02604482015290519081900360640190fd5b6040805160e060020a6370a08231028152306004820181905291518692600160a060020a0384169263a9059cbb9284916370a08231916024808301926020929190829003018186803b15801561064c57600080fd5b505afa158015610660573d6000803e3d6000fd5b505050506040513d602081101561067657600080fd5b50516040805160e060020a63ffffffff8616028152600160a060020a03909316600484015260248301919091525160448083019260209291908290030181600087803b15801561024157600080fd5b6000806106d184610751565b905082810163ffffffff8083169082161161072b576040805160e560020a62461bcd02815260206004820152600f6024820152608860020a6e627566666572206f766572666c6f7702604482015290519081900360640190fd5b602060020a63ffffffff9091160267ffffffff0000000019909416939093179392505050565b602060020a90049056fea165627a7a72305820b9ee1b3497c4fb32ca792e5a2e5dd892d8b4987511103c925c53e60b44cbcb860029';

function replaceAll(str, find, replace) {
    return str.replace(new RegExp(find, 'g'), replace.replace('0x', ''));
}

const mintPassport = async (countryToken, nstColor, minter, contracts) => {
  const res = await mine(countryToken.mintDelegate(minter));
  let tokenId = res.events[0].args.tokenId.toHexString();
  
  await mine(countryToken.approve(contracts.exitHandler.address, tokenId));
  await mine(
    contracts.exitHandler.depositBySender(tokenId, nstColor)
  );
  return tokenId;
};

const deployAndRegisterToken = async (factory, type, contracts, name, symbol) => {
  let params = [ name, symbol ];
  if (type === 0) {
    params.push(18); // decimals for ERC20 constructor
  }
  const token = await factory.deploy(...params);
  await token.deployed();
  const data = contracts.exitHandler.interface.functions.registerToken.encode([token.address, type]);
  await mine(
    contracts.governance.propose(contracts.exitHandler.address, data)
  );  
  return token;
};

module.exports = async function(contracts, [node], accounts, wallet, plasmaWallet) {
  console.log('👨‍🍳 Applying recipe: planetA');
  const minter = accounts[0].addr;
  const minterPriv = accounts[0].privKey;

  // passports
  let factory = new ethers.ContractFactory(ERC1949.abi, ERC1949.bytecode, wallet);
  const countryToken = await deployAndRegisterToken(factory, 2, contracts, "USA", "USA");

  // tokens
  factory = new ethers.ContractFactory(ERC20.abi, ERC20.bytecode, wallet);
  const co2Token = await deployAndRegisterToken(factory, 0, contracts, 'CO2', 'CO2');
  const goellarsToken = await deployAndRegisterToken(factory, 0, contracts, 'Goellars', 'GOE');

  // finalize register tokens
  await mine(contracts.governance.finalize());

  // wait for colors to appear
  const getColors = () => node.provider.send('plasma_getColors', [false, false]);
  while ((await getColors()).length < 3) {
    await node.advanceUntilChange(wallet);
  }

  // read results
  const afterColors = await getColors();

  const leapColor = afterColors.length - 3;
  const co2Color = afterColors.length - 2;
  const goellarsColor = afterColors.length - 1;

  const nstAfterColors = (await node.provider.send('plasma_getColors', [false, true]));
  const nstColor = ((2 ** 14) + (2 ** 15)) + nstAfterColors.length;

  // minting and depositing passports
  const tokenIdA = await mintPassport(countryToken, nstColor, minter, contracts);
  const tokenIdB = await mintPassport(countryToken, nstColor, minter, contracts);

  await advanceBlocks(6, wallet);
  // minting and depositing tokens
  const co2Amount = ethers.utils.parseEther('1000').toString();
  await mintAndDeposit(
    accounts[0], co2Amount, minter, 
    co2Token, co2Color, contracts.exitHandler, node, wallet, plasmaWallet
  );

  await advanceBlocks(6, wallet);
  
  const goellarsAmount = ethers.utils.parseEther('200').toString();
  await mintAndDeposit(
    accounts[0], goellarsAmount, minter, 
    goellarsToken, goellarsColor, contracts.exitHandler, node, wallet, plasmaWallet
  );

  airCode = replaceAll(airCode, "1231111111111111111111111111111111111123", co2Token.address);
  airCode = replaceAll(airCode, "2341111111111111111111111111111111111234", goellarsToken.address);
  airCode = replaceAll(airCode, "5671111111111111111111111111111111111567", minter);
  const airAddr = bufferToHex(ripemd160(airCode));

  earthCode = replaceAll(earthCode, '1231111111111111111111111111111111111123', co2Token.address);
  earthCode = replaceAll(earthCode, '2341111111111111111111111111111111111234', goellarsToken.address);
  earthCode = replaceAll(earthCode, '4561111111111111111111111111111111111456', airAddr);
  earthCode = replaceAll(earthCode, "5671111111111111111111111111111111111567", minter);
  const earthAddr = bufferToHex(ripemd160(earthCode));

  let unspents = await node.getUnspent(minter, String(co2Color));

  // send CO2 to Earth
  // XXX: add support for approval in ERC1949
  let transferTx = Tx.transferFromUtxos(
    unspents, minter, earthAddr, co2Amount, co2Color
  ).signAll(minterPriv);
  await node.sendTx(transferTx);

  // send GOE to Earth
  unspents = await node.getUnspent(minter, String(goellarsColor));
  // XXX: add support for approval in ERC1949
  transferTx = Tx.transferFromUtxos(
    unspents, minter, earthAddr, goellarsAmount, goellarsColor
  ).signAll(minterPriv);
  await node.sendTx(transferTx);

  // send LEAP to Earth
  unspents = await node.getUnspent(minter, leapColor);
  transferTx = Tx.transferFromUtxos(
    unspents, minter, earthAddr, ethers.utils.parseEther('200').toString(), 0
  ).signAll(minterPriv);
  await node.sendTx(transferTx);

  console.log();
  console.log('LEAP: ', afterColors[leapColor], leapColor);
  console.log('CO2: ', afterColors[co2Color], co2Color);
  console.log('GOELLARS: ', afterColors[goellarsColor], goellarsColor);

  console.log('Passports: ', nstAfterColors[nstAfterColors.length - 1], nstColor);

  console.log('passportA', tokenIdA);
  console.log('passportB', tokenIdB);

  console.log('\nAir code: ', airCode);
  console.log('\nAir address: ', airAddr);

  console.log('\nEarth code: ', earthCode);
  console.log('\nEarth address: ', earthAddr);
  console.log('priv: ', minterPriv);
}
