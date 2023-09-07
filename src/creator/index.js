const fs = require('fs');
const path = require('path');

const parseEvent = require('./parseEvent');
const { getMaxBlock } = require('../adapters/queries');
const { castTypesCreator } = require('../utils/castTypes');
const { blockRange } = require('../utils/params');
const { indexa } = require('../utils/dbConnection');
const checkIfStale = require('../utils/stale');
const { insertEvents } = require('../adapters/queries');

// load modules
const modulesDir = path.join(__dirname, './');
const modules = [];
fs.readdirSync(modulesDir)
  .filter((mplace) => !mplace.endsWith('.js') && mplace !== 'opensea-shared') // tmp disable opensea-shared
  .forEach((mplace) => {
    modules.push(require(path.join(modulesDir, mplace)));
  });

const exe = async () => {
  // get max blocks for each table
  let [blockEvents, blockCreator] = await indexa.task(async (t) => {
    return await Promise.all(
      ['event_logs', 'nft_creator'].map((table) =>
        getMaxBlock(t, `ethereum.${table}`)
      )
    );
  });

  console.log(
    `syncing nft_creator, ${
      blockEvents - blockCreator
    } blocks behind event_logs`
  );

  // check if stale
  let stale = checkIfStale(blockEvents, blockCreator);

  // forward fill
  while (stale) {
    let startBlock = blockCreator + 1;
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

    let response;
    if (parsedEvents.length) {
      const payload = parsedEvents.map((e) => castTypesCreator(e));
      response = await insertEvents(payload, 'ethereum.nft_creator');
    }

    stale = checkIfStale(blockEvents, endBlock);
    blockCreator = endBlock;
    console.log(
      `synced blocks: ${startBlock}-${
        stale ? endBlock : blockEvents
      } [inserted: ${response?.rowCount ?? 0} | blocks remaining: ${
        stale ? Math.max(blockEvents - blockCreator, 0) : 0
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
