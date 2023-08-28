const fs = require('fs');
const path = require('path');

const parseEvent = require('./parseEvent');
const {
  getMaxBlock,
  insertEvents,
  insertTradesHistoryTx,
} = require('./queries');
const { castTypesTrades, castTypesHistory } = require('../utils/castTypes');
const { blockRange, exclude } = require('../utils/params');
const { indexa } = require('../utils/dbConnection');
const checkIfStale = require('../utils/stale');

// load modules
const modulesDir = path.join(__dirname, './');
const modules = [];
fs.readdirSync(modulesDir)
  .filter((mplace) => !mplace.endsWith('.js') && !exclude.includes(mplace))
  .forEach((mplace) => {
    modules.push(require(path.join(modulesDir, mplace)));
  });

const exe = async () => {
  // get max blocks for each table
  let [blockEvents, blockTrades, blockHistory] = await indexa.task(
    async (t) => {
      return await Promise.all(
        ['event_logs', 'nft_trades', 'nft_history'].map((table) =>
          getMaxBlock(t, `ethereum.${table}`)
        )
      );
    }
  );

  // to prevent parsing the same event(s) multiple times which would lead to inserting duplicates into the db
  // we take the max block of the two tables and use that as the starting point (+1 offset)
  let blockNft = Math.max(blockTrades, blockHistory);

  console.log(
    `syncing nft tables, ${blockEvents - blockNft} blocks behind event_logs`
  );

  // check if stale
  let stale = checkIfStale(blockEvents, blockNft);

  // forward fill
  while (stale) {
    let startBlock = blockNft + 1;
    let endBlock = startBlock + blockRange;

    const parsedEvents = (
      await indexa.task(async (t) => {
        return await Promise.all(
          modules.map((m) =>
            parseEvent(t, startBlock, endBlock, m.abi, m.config, m.parse)
          )
        );
      })
    ).flat();

    let payloadTrades = [];
    let payloadHistory = [];
    let countTrades = 0;
    let countHistory = 0;
    if (parsedEvents.length) {
      for (const e of parsedEvents) {
        if (e.eventType) {
          payloadHistory.push(castTypesHistory(e));
        } else {
          payloadTrades.push(castTypesTrades(e));
        }
      }
      let response;
      if (payloadTrades.length && payloadHistory.length) {
        response = await insertTradesHistoryTx(payloadTrades, payloadHistory);
        countTrades = response.data[0].rowCount;
        countHistory = response.data[1].rowCount;
      } else if (payloadTrades.length) {
        response = await insertEvents(payloadTrades, 'ethereum.nft_trades');
        countTrades = response?.rowCount ?? 0;
      } else {
        response = await insertEvents(payloadHistory, 'ethereum.nft_history');
        countHistory = response?.rowCount ?? 0;
      }
    }

    stale = checkIfStale(blockEvents, endBlock);
    blockNft = endBlock;
    console.log(
      `synced blocks: ${startBlock}-${
        stale ? endBlock : blockEvents
      } [inserted: ${
        countTrades + countHistory
      } (trades: ${countTrades} history: ${countHistory}) | blocks remaining: ${
        stale ? Math.max(blockEvents - blockNft, 0) : 0
      } ]`
    );
  }

  // once synced with event_logs, pausing for min 12 sec (1block) before next sync starts
  const pause = 15 * 1e3;
  console.log(`pausing exe for ${pause / 1e3}sec...\n`);
  await new Promise((resolve) => setTimeout(resolve, pause));
  await exe();
};

exe();
