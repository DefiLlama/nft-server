const fs = require('fs');
const path = require('path');

const parseEvent = require('./parseEventHistory');
const { getMaxBlock } = require('./queries');
const { insertHistory } = require('./queriesHistory');
const castTypes = require('../utils/castTypesHistory');
const { blockRange, exclude } = require('../utils/params');
const { indexa } = require('../utils/dbConnection');
const checkIfStale = require('../utils/stale');

// load modules
const modulesDir = path.join(__dirname, './');
let modules = [];
fs.readdirSync(modulesDir)
  .filter((mplace) => !mplace.endsWith('.js') && !exclude.includes(mplace))
  .forEach((mplace) => {
    const p = path.join(modulesDir, mplace, 'indexHistory.js');
    if (fs.existsSync(p)) {
      modules.push(require(p));
    }
  });

// filter config.events array to non saleEvents
modules = modules.map((m) => ({
  ...m,
  config: {
    ...m.config,
    events: m.config.events.filter((e) => e?.saleEvent !== true),
  },
}));

const exe = async () => {
  // get max blocks for each table
  let [blockEvents, blockHistory] = await indexa.task(async (t) => {
    return await Promise.all(
      ['event_logs', 'nft_history'].map((table) =>
        getMaxBlock(t, `ethereum.${table}`)
      )
    );
  });

  console.log(
    `syncing nft_history, ${
      blockEvents - blockHistory
    } blocks behind event_logs`
  );

  // check if stale
  let stale = checkIfStale(blockEvents, blockHistory);

  // forward fill
  while (stale) {
    let startBlock = blockHistory + 1;
    let endBlock = startBlock + blockRange;

    const history = await indexa.task(async (t) => {
      return await Promise.all(
        modules.map((m) =>
          parseEvent(t, startBlock, endBlock, m.abi, m.config, m.parse)
        )
      );
    });

    const payload = castTypes(history.flat());

    let response;
    if (payload.length) {
      response = await insertHistory(payload);
    }

    stale = checkIfStale(blockEvents, endBlock);
    blockHistory = endBlock;
    console.log(
      `synced blocks: ${startBlock}-${
        stale ? endBlock : blockEvents
      } [inserted: ${response?.rowCount ?? 0} | blocks remaining: ${
        stale ? Math.max(blockEvents - blockHistory, 0) : 0
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
