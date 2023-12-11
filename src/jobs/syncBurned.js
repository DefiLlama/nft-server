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
  ethereum.nft_transfers
WHERE
  to_address IN (
      '\\x0000000000000000000000000000000000000000',
      '\\xdead000000000000000000000000000000000000',
      '\\x000000000000000000000000000000000000dead'
  )
  `;

  const response = await indexa.query(query);

  if (!response) {
    return new Error(`Couldn't get data`, 404);
  }

  return response[0].min;
};

const getBurned = async (start, stop) => {
  const query = minify(`
SELECT
    encode(collection, 'hex') AS collection,
    encode(token_id, 'escape') AS token_id,
    encode(transaction_hash, 'hex') AS transaction_hash,
    block_time,
    block_number,
    log_index,
    encode(from_address, 'hex') AS from_address
FROM
    ethereum.nft_transfers t
WHERE
    block_number >= $<start>
    AND block_number <= $<stop>
    AND (
        to_address = '\\x0000000000000000000000000000000000000000'
        OR to_address = '\\xdead000000000000000000000000000000000000'
    )
`);

  const response = await indexa.query(query, { start, stop });

  if (!response) {
    return new Error(`Couldn't get data`, 404);
  }

  return response;
};

const castTypes = (e) => {
  return {
    collection: Buffer.from(e.collection.replace('0x', ''), 'hex'),
    token_id: Buffer.from(e.token_id.toString()),
    transaction_hash: Buffer.from(e.transaction_hash.replace('0x', ''), 'hex'),
    block_time: new Date(e.block_time),
    block_number: Number(e.block_number),
    log_index: Number(e.log_index),
    from_address: Buffer.from(e.from_address.replace('0x', ''), 'hex'),
  };
};

const insertBurned = async (burned) => {
  const columns = [
    'collection',
    'token_id',
    'transaction_hash',
    'block_time',
    'block_number',
    'log_index',
    'from_address',
  ];
  const cs = new pgp.helpers.ColumnSet(columns, {
    // column set requries tablename if schema is defined
    table: new pgp.helpers.TableName({
      schema: 'ethereum',
      table: 'nft_burned',
    }),
  });
  const query =
    pgp.helpers.insert(burned, cs) +
    ' ON CONFLICT (collection, token_id) DO NOTHING';

  const response = await indexa.result(query);

  return response;
};

const sync = async () => {
  let [blockTransfers, blockBurned] = await indexa.task(async (t) => {
    return await Promise.all(
      ['nft_transfers', 'nft_burned'].map((table) =>
        getMaxBlock(t, `ethereum.${table}`)
      )
    );
  });

  let blockLastSynced = blockBurned ?? (await getMinBlock()) - 1;

  console.log(
    `syncing nft_burned, ${
      blockTransfers - blockLastSynced
    } block(s) behind nft_transfers\n`
  );

  let stale = checkIfStale(blockTransfers, blockLastSynced);

  while (stale) {
    let startBlock = blockLastSynced + 1;
    let endBlock = Math.min(startBlock + BLOCK_RANGE, blockTransfers);

    const burned = await getBurned(startBlock, endBlock);

    if (burned.length) {
      const payloadBurned = burned.map((i) => castTypes(i));

      const response = await insertBurned(payloadBurned);
      const count = response?.rowCount ?? 0;

      console.log(
        `synced blocks: ${startBlock}-${
          stale ? endBlock : blockTransfers
        } [inserted: ${count}]`
      );
    } else {
      console.log(
        `synced blocks: ${startBlock}-${stale ? endBlock : blockTransfers}`
      );
    }

    stale = checkIfStale(blockTransfers, endBlock);
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
