const fs = require('fs');
const path = require('path');

const parseEvent = require('../utils/parseEvent');
const insertTrades = require('../controllers/nftTrades');
const getMaxBlock = require('../controllers/common');
const castTypes = require('../utils/castTypes');
const { blockRange } = require('../utils/params');

const importModules = () => {
  const modulesDir = path.join(__dirname, '../adapters');
  const modules = [];
  fs.readdirSync(modulesDir)
    .filter((mplace) => !mplace.endsWith('.js'))
    .forEach((mplace) => {
      modules.push(require(path.join(modulesDir, mplace)));
    });

  return modules;
};

const isStale = async () => {
  const blocks = await Promise.all([
    getMaxBlock('ethereum.event_logs'),
    getMaxBlock('ethereum.nft_trades'),
  ]);
  const stale = blocks[0] - blocks[1] > blockRange ? True : False;
  return [stale, blocks];
};

const ffill = async (blocks) => {
  const modules = importModules();
  const startBlock = blocks[1] + 1;
  const endBlock = startBlock + blockRange;

  console.log(`ffill for ${startBlock}-${endBlock}`);
  console.log('parseEvent...');
  const payload = await Promise.all(
    modules.map((m) =>
      parseEvent(startBlock, endBlock, m.abi, m.config, m.parse)
    )
  );

  console.log('insertTrades...');
  await insertTrades(castTypes(payload));
};

// 300sec
const duration = 3 * 1e5;
const exe = async () => {
  const [stale, blocks] = await isStale();
  while (stale) {
    await ffill(blocks);
  }
  console.log('pausing exe...');
  await new Promise((resolve) => setTimeout(resolve, duration));
  await exe();
};

exe();
