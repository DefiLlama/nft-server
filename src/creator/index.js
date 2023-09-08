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
  .filter((mplace) => !mplace.endsWith('.js'))
  .forEach((mplace) => {
    modules.push(require(path.join(modulesDir, mplace)));
  });

// - reads max block from event_logs and nft_creator
// - repeat until !stale -> fetch data, parse, insert (if length)
// - return that last synced block = blockEvents = endBlock (in last round)
const sync = async (blockLastSynced) => {
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
      blockEvents - (blockLastSynced ?? blockCreator)
    } block(s) behind event_logs`
  );

  // check if stale:
  // when starting the process for the first time we sync from blockheight in nft_creator
  // (=blockCreator). after resuming sync(), we use blockLastSynced instead. reason: creator events
  // are sparse, so frequent inserts are unlikely. that means if we'd keep on using blockCreator
  // we'd uneccesarily read/process the same empty data again. using `blockLastSynced` prevents
  // that. note: we wouldn't insert duplicates even if we'd use blockCreator instead,
  // so this is just a thing to keep the read load to event_logs smol
  let stale = checkIfStale(blockEvents, blockLastSynced ?? blockCreator);

  // forward fill
  while (stale) {
    let startBlock = (blockLastSynced ?? blockCreator) + 1;
    let endBlock = Math.min(startBlock + blockRange, blockEvents);

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

  return blockEvents;
};

const exe = async () => {
  let blockLastSynced = null;
  // continous sync process which forward fills
  while (true) {
    // sync nft_creator with event_logs until it reaches same block height (= blockLastSynced)
    blockLastSynced = await sync(blockLastSynced);
    // pausing for N sec once synced and then resume sync()
    const pause = 15 * 1e3;
    console.log(`pausing exe for ${pause / 1e3}sec...\n`);
    await new Promise((resolve) => setTimeout(resolve, pause));
  }
};

exe();
