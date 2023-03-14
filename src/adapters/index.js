const fs = require('fs');
const path = require('path');

const parseEvent = require('../utils/parseEvent');
const insertTrades = require('../controllers/nftTrades');
const getMaxBlock = require('../controllers/common');
const castTypes = require('../utils/castTypes');
const { blockRange } = require('../utils/params');

const checkIfStale = (blockEvents, blockTrades) =>
  blockEvents - blockTrades > blockRange ? true : false;

// 300sec
const duration = 3 * 1e5;
const exe = async () => {
  console.log('starting');
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
  console.log(
    `nft_trades is ${blockEvents - blockTrades} blocks behind event_logs\n`
  );

  // check if stale
  let stale = checkIfStale(blockEvents, blockTrades);

  // forward fill
  while (stale) {
    let startBlock = blockTrades + 1;
    let endBlock = startBlock + blockRange;

    console.log(
      `ffill for ${startBlock}-${endBlock} [${
        blockEvents - endBlock
      } blocks remaining to sync]`
    );
    console.log('parse events...');
    const payload = await Promise.all(
      modules
        .filter((m) => m.config.exchangeName === 'blur')
        .map((m) => parseEvent(startBlock, endBlock, m.abi, m.config, m.parse))
    );

    console.log('insertTrades...\n');
    await insertTrades(castTypes(payload.flat()));

    stale = checkIfStale(blockEvents, endBlock);
    blockTrades = endBlock;
  }
  console.log('pausing exe...');
  await new Promise((resolve) => setTimeout(resolve, duration));
  await exe();
};

exe();
