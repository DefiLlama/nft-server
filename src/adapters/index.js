const fs = require('fs');
const path = require('path');

const parseEvent = require('../utils/parseEvent');
const insertTrades = require('../controllers/nftTrades');
const getMaxBlock = require('../controllers/common');
const castTypes = require('../utils/castTypes');
const { blockRange } = require('../utils/params');

// 300sec
const duration = 3 * 1e5;
const exe = async () => {
  // load modules
  const modulesDir = path.join(__dirname, '../adapters');
  const modules = [];
  fs.readdirSync(modulesDir)
    .filter((mplace) => !mplace.endsWith('.js'))
    .forEach((mplace) => {
      modules.push(require(path.join(modulesDir, mplace)));
    });

  // get max blocks for each table
  const blockEvents = await getMaxBlock('indexa', 'ethereum.event_logs');
  let blockTrades = await getMaxBlock('nft', 'nft_trades');

  // check if stale
  let stale = blockEvents - blockTrades > blockRange ? true : false;

  // forward fill
  while (stale) {
    let startBlock = blockTrades + 1;
    let endBlock = startBlock + blockRange;

    console.log(`ffill for ${startBlock}-${endBlock}`);
    console.log('parse events...');
    const payload = await Promise.all(
      modules
        .filter((m) => m.config.exchangeName === 'blur')
        .map((m) => parseEvent(startBlock, endBlock, m.abi, m.config, m.parse))
    );

    console.log('insertTrades...\n');
    await insertTrades(castTypes(payload.flat()));

    stale = blockEvents - endBlock > blockRange ? true : false;
    blockTrades = endBlock;
  }
  console.log('pausing exe...');
  await new Promise((resolve) => setTimeout(resolve, duration));
  await exe();
};

exe();
