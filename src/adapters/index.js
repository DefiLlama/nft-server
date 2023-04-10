const fs = require('fs');
const path = require('path');

const parseEvent = require('./parseEvent');
const { getMaxBlock, insertTrades } = require('../controllers/nftTrades');
const castTypes = require('../utils/castTypes');
const { blockRange } = require('../utils/params');

const checkIfStale = (blockEvents, blockTrades) => blockEvents > blockTrades;

const exe = async () => {
  // load modules
  const modulesDir = path.join(__dirname, '../adapters');
  const modules = [];
  fs.readdirSync(modulesDir)
    .filter((mplace) => !mplace.endsWith('.js'))
    .filter((mplace) => !['openseaWyvern'].includes(mplace))
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
    `syncing nft_trades, ${blockEvents - blockTrades} blocks behind event_logs`
  );

  // check if stale
  let stale = checkIfStale(blockEvents, blockTrades);

  // forward fill
  while (stale) {
    let startBlock = blockTrades + 1;
    let endBlock = startBlock + blockRange;

    const trades = await Promise.all(
      modules.map((m) =>
        parseEvent(startBlock, endBlock, m.abi, m.config, m.parse)
      )
    );
    const payload = castTypes(trades.flat());

    let response;
    if (payload.length) {
      response = await insertTrades(payload);
    }

    stale = checkIfStale(blockEvents, endBlock);
    blockTrades = await getMaxBlock('ethereum.nft_trades');

    if (response) {
      console.log(
        `synced blocks: ${startBlock}-${blockTrades} [inserted: ${
          response.rowCount
        } trades | blocks remaining: ${Math.max(
          blockEvents - blockTrades,
          0
        )} ]`
      );
    } else {
      console.log(`empty payload for: ${startBlock}-${blockTrades}`);
    }
  }

  // once synced with event_logs, pausing for 12 sec (1block) before next sync starts
  const pause = 12 * 1e3;
  console.log(`pausing exe for ${pause / 1e3}sec...\n`);
  await new Promise((resolve) => setTimeout(resolve, pause));
  await exe();
};

exe();
