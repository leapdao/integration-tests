const fs = require('fs');
const spawn = require('child_process').spawn;
const ethers = require('ethers');
const ganache = require('ganache-cli');

const { getRootEnv, getPlasmaEnv, generatedConfigPath } = require('./getEnv');

const mnemonic = require('./mnemonic');

const Node = require('./nodeClient');
const { setupPlasma, setupValidators } = require('./setup');
const { formatHostname } = require('./helpers');

async function setupGanache(port, mnemonic) {
  return new Promise(
    (resolve, reject) => {
      console.log('Starting ganache..');
      const srv = ganache.server({ locked: false, mnemonic, blockTime: 1, network_id: 5777 });
      srv.listen(port, (err) => {
        if (err) {
          return reject();
        }
        resolve();
      });
    }
  );
}

async function deployContracts(ganachePort) {
  return new Promise(
    (resolve, reject) => {
      console.log('Deploying contracts.. Logs: ./out/contracts.log');
      const env = {
        ...process.env,
        PROPOSAL_TIME: '0',
        PARENT_BLOCK_INTERVAL: '0',
        ADVANCE_BLOCK: '0',
        EPOCH_LENGTH: '2',
      };
      const cwd = process.cwd();
      
      process.chdir(`${cwd}/build/contracts`);
      let truffleConfig = fs.readFileSync('./truffle-config.js').toString();
      // replace the rpc port(s)
      while (true) {
        let tmp = truffleConfig.replace(/port: [0-9]+/g, `port: ${ganachePort.toString()}`);

        if (tmp === truffleConfig) {
          break;
        }
        truffleConfig = tmp;
      }
      fs.writeFileSync('./truffle-config.js', truffleConfig);
      
      let proc = spawn('yarn', ['deploy', '--reset'], { env });
      const logOutput = fs.createWriteStream(`${cwd}/out/contracts.log`);
      proc.stdout.pipe(logOutput);
      proc.stderr.pipe(logOutput);
      proc.on('exit', (exitCode) => {
        process.chdir(cwd);
        
        if (exitCode !== 0) {
          return reject();
        }
        
        resolve();
      });
    }
  );
}

async function spawnNode(rpcPort, args, env, logOutput) {
  return new Promise(
    async (resolve, reject) => {
      const proc = spawn('node', args, { env });

      proc.stdout.pipe(logOutput);
      proc.stderr.pipe(logOutput);
      proc.on('exit', (exitCode) => console.log('leap-node exit', exitCode));

      while (true) {
        let res;
        try {
          // if we construct the rpc provider before the node is up,
          // we will get a uncaught promise rejection because ethers.js
          // invokes a request to it we can not catch :/
          res = await ethers.utils.fetchJson(
            formatHostname('localhost', rpcPort),
            '{"jsonrpc":"2.0","id":42,"method":"plasma_status","params":[]}'
          );
        } catch (e) {}
        // ready
        if (res && res.result === 'ok') {
          const node = new Node('localhost', rpcPort);
          return resolve(node);
        }

        await new Promise((resolve) => setTimeout(() => resolve(), 100));
      }
    }
  );
}

const spawnNodes = async () => {
  // seems like only one connection from the same source addr can connect to the same tendermint instance
  const numNodes = parseInt(process.env['num_nodes']) || 2;
  const nodes = [];

  let basePort = parseInt(process.env['base_port']) || 7000;
  const firstNodeURL = `http://localhost:${basePort}`;

  for (let i = 0; i < numNodes; i++) {
    const rpcPort = basePort;
    const env = { 
      ...process.env,
      DEBUG: 'tendermint,leap-node*'
    };
    const configURL = i === 0 ? generatedConfigPath : firstNodeURL;
    const args = [
      'build/node/index.js',
      '--config', configURL,
      '--rpcaddr', '127.0.0.1',
      '--rpcport', (basePort++).toString(),
      '--wsaddr', '127.0.0.1',
      '--wsport', (basePort++).toString(),
      '--abciPort', (basePort++).toString(),
      '--p2pPort', (basePort++).toString(),
      '--tendermintAddr', '127.0.0.1',
      '--tendermintPort', (basePort++).toString(),
      '--devMode', 'true',
    ];

    const logOutput = fs.createWriteStream(`./out/node-${i + 1}.log`);

    console.log(`Starting node ${i + 1} of ${numNodes} Logs: ./out/node-${i + 1}.log`);
    nodes.push(await spawnNode(rpcPort, args, env, logOutput));
  }
  return nodes;
};

const appendToConfig = (appendix) => {
  const config = Object.assign(
    JSON.parse(fs.readFileSync('./process.json', { flag: 'a+' }).toString() || '{}'),
    appendix,
  );

  fs.writeFileSync('./process.json', JSON.stringify(config, null, 2));
}

const connectOrStartRootNetwork = async () => {
  try {
    const rootEnv = await getRootEnv();
    console.log('Reusing existing Ganache instance');
    return rootEnv;
  } catch (e) { }

  const ganachePort = parseInt(process.env['ganache_port']) || 8545;
  await setupGanache(ganachePort, mnemonic);
  await deployContracts(ganachePort);
  
  appendToConfig({ ganache: `http://localhost:${ganachePort}` });
  
  const rootEnv = await getRootEnv();
  await setupPlasma(rootEnv);
  return rootEnv;
};

const connectOrStartPlasmaNetwork = async (rootEnv) => {
  try {
    const plasmaEnv = await getPlasmaEnv();
    console.log('Reusing existing leap-node instance');
    return plasmaEnv;
  } catch (e) { }

  const nodes = await spawnNodes();
  appendToConfig({ nodes: nodes.map(n => n.toString()) });
  const plasmaEnv = await getPlasmaEnv();
  await setupValidators({ ...rootEnv, ...plasmaEnv });
  return getPlasmaEnv();
};

module.exports = async () => {
  let plasmaEnv = {};
  const onlyRootChain = !!process.argv.find(a => a === '--onlyRoot');

  const { accounts, wallet, contracts, ganache } = await connectOrStartRootNetwork();;

  if (!onlyRootChain) {
    plasmaEnv = await connectOrStartPlasmaNetwork({ contracts, accounts, wallet });

    const mintAndDeposit = require('../tests/actions/mintAndDeposit');

    await mintAndDeposit(
      accounts[0], '200000000000000000000', accounts[0].addr, 
      contracts.token, 0, contracts.exitHandler, wallet, plasmaEnv.plasmaWallet
    );
  
  }

  console.log(`\n Root chain RPC (ganache): ${ganache}`);
  plasmaEnv.nodes 
    && console.log(`            Leap JSON RPC: ${plasmaEnv.nodes[0].getRpcUrl()}`);

  console.log('\n       Funded private key:', accounts[0].privKey);

  plasmaEnv.nodes && console.log('\nLocal Leap network is ready. ✨');

  const { nodes, plasmaWallet, networkConfig } = plasmaEnv;

  return { contracts, nodes, accounts, wallet, plasmaWallet, networkConfig };
};

