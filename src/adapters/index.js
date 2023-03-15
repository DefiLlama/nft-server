const fs = require('fs');
const path = require('path');

const parseEvent = require('./parseEvent');
const { getMaxBlock, insertTrades } = require('../controllers/nftTrades');
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
  let [blockEvents, blockTrades] = await Promise.all(
    ['event_logs', 'nft_trades'].map((table) =>
      getMaxBlock(`ethereum.${table}`)
    )
  );
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
    const trades = await Promise.all(
      modules
        .filter((m) => !['zora'].includes(m.config.exchangeName))
        .map((m) => parseEvent(startBlock, endBlock, m.abi, m.config, m.parse))
    );
    const payload = castTypes(trades.flat());

    await insertTrades(payload);

    stale = checkIfStale(blockEvents, endBlock);
    blockTrades = endBlock;
  }
  console.log('pausing exe...');
  await new Promise((resolve) => setTimeout(resolve, duration));
  await exe();
};

exe();
