const minify = require('pg-minify');

const { pgp, indexa } = require('../utils/dbConnection');
const { getMaxBlock } = require('../adapters/queries');
const checkIfStale = require('../utils/stale');

const BLOCK_RANGE = 1000;

const getMinBlock = async () => {
  const query = `
SELECT
  MIN(block_number)
FROM
  ethereum.event_logs
WHERE
  topic_0 = '\\x8be0079c531659141344cd1fd0a4f28419497f9722a3daafe3b4186f6b6457e0'
  AND topic_1 = '\\x0000000000000000000000000000000000000000000000000000000000000000'
  `;

  const response = await indexa.query(query);

  if (!response) {
    return new Error(`Couldn't get data`, 404);
  }

  return response[0].min;
};

const getData = async (start, stop) => {
  const query = minify(`
SELECT
  encode(transaction_hash, 'hex') AS transaction_hash,
  log_index,
  encode(contract_address, 'hex') AS contract_address,
  encode(topic_2, 'hex') AS topic_2,
  block_time,
  block_number
FROM
  ethereum.event_logs
WHERE
  block_number >= $<start>
  AND block_number <= $<stop>
  AND topic_0 = '\\x8be0079c531659141344cd1fd0a4f28419497f9722a3daafe3b4186f6b6457e0'
  AND topic_1 = '\\x0000000000000000000000000000000000000000000000000000000000000000'
  AND topic_2 IS NOT NULL
`);

  const response = await indexa.query(query, { start, stop });

  if (!response) {
    return new Error(`Couldn't get data`, 404);
  }

  return response;
};

const castTypes = (e) => {
  return {
    transaction_hash: Buffer.from(e.transaction_hash.replace('0x', ''), 'hex'),
    log_index: Number(e.log_index),
    block_time: new Date(e.block_time),
    block_number: Number(e.block_number),
    collection: Buffer.from(e.contract_address.replace('0x', ''), 'hex'),
    new_owner: Buffer.from(e.topic_2.substring(24).replace('0x', ''), 'hex'),
  };
};

const insertData = async (burned) => {
  const columns = [
    'transaction_hash',
    'log_index',
    'block_time',
    'block_number',
    'collection',
    'new_owner',
  ];
  const cs = new pgp.helpers.ColumnSet(columns, {
    // column set requries tablename if schema is defined
    table: new pgp.helpers.TableName({
      schema: 'ethereum',
      table: 'nft_ownership_transferred',
    }),
  });
  const query = pgp.helpers.insert(burned, cs);

  const response = await indexa.result(query);

  return response;
};

const sync = async () => {
  let [blockEventLogs, blockOwnershipTransferred] = await indexa.task(
    async (t) => {
      return await Promise.all(
        ['event_logs', 'nft_ownership_transferred'].map((table) =>
          getMaxBlock(t, `ethereum.${table}`)
        )
      );
    }
  );

  let blockLastSynced = blockOwnershipTransferred ?? (await getMinBlock()) - 1;

  console.log(
    `syncing nft_ownership_transferred, ${
      blockEventLogs - blockLastSynced
    } block(s) behind event_logs\n`
  );

  let stale = checkIfStale(blockEventLogs, blockLastSynced);

  while (stale) {
    let startBlock = blockLastSynced + 1;
    let endBlock = Math.min(startBlock + BLOCK_RANGE, blockEventLogs);

    const data = await getData(startBlock, endBlock);

    if (data.length) {
      const payload = data.map((i) => castTypes(i));

      const response = await insertData(payload);
      const count = response?.rowCount ?? 0;

      console.log(
        `synced blocks: ${startBlock}-${
          stale ? endBlock : blockEventLogs
        } [inserted: ${count}]`
      );
    } else {
      console.log(
        `synced blocks: ${startBlock}-${stale ? endBlock : blockEventLogs}`
      );
    }

    stale = checkIfStale(blockEventLogs, endBlock);
    blockLastSynced = endBlock;
  }
};

const exe = async () => {
  while (true) {
    await sync();
    console.log('pausing exe');
    await new Promise((resolve) => setTimeout(resolve, 15 * 1e3));
  }
};

exe();
