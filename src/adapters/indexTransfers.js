const parseEvent = require('./parseEventTransfers');
const { getMaxBlock } = require('./queries');
const { insertTransfers } = require('./queriesTransfers');
const castTypes = require('../utils/castTypesTransfers');
const { blockRange } = require('../utils/params');
const { indexa } = require('../utils/dbConnection');
const checkIfStale = require('../utils/stale');

const exe = async () => {
  // get max blocks for each table
  let [blockEvents, blockTransfers] = await indexa.task(async (t) => {
    return await Promise.all(
      ['event_logs', 'nft_transfers'].map((table) =>
        getMaxBlock(t, `ethereum.${table}`)
      )
    );
  });

  console.log(
    `syncing nft_transfers, ${
      blockEvents - blockTransfers
    } blocks behind event_logs`
  );

  // check if stale
  let stale = checkIfStale(blockEvents, blockTransfers);

  // forward fill
  while (stale) {
    let startBlock = blockTransfers + 1;
    let endBlock = startBlock + blockRange;

    const transfers = await indexa.task(async (t) => {
      return await parseEvent(t, startBlock, endBlock);
    });

    const payload = castTypes(transfers);

    let response;
    if (payload.length) {
      response = await insertTransfers(payload);
    }

    stale = checkIfStale(blockEvents, endBlock);
    blockTransfers = endBlock;
    console.log(
      `synced blocks: ${startBlock}-${
        stale ? endBlock : blockEvents
      } [inserted: ${response?.rowCount ?? 0} | blocks remaining: ${
        stale ? Math.max(blockEvents - blockTransfers, 0) : 0
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
