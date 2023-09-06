const minify = require('pg-minify');

const { pgp, indexa } = require('../utils/dbConnection');

const queries = {
  generic: `
SELECT
  encode(e.transaction_hash, 'hex') AS transaction_hash,
  e.log_index,
  encode(e.contract_address, 'hex') AS contract_address,
  encode(e.topic_0, 'hex') AS topic_0,
  encode(e.topic_1, 'hex') AS topic_1,
  encode(e.topic_2, 'hex') AS topic_2,
  encode(e.topic_3, 'hex') AS topic_3,
  encode(e.data, 'hex') AS data,
  e.block_time,
  e.block_number,
  encode(e.block_hash, 'hex') AS block_hash
FROM
  ethereum.event_logs e
WHERE
  e.contract_address in ($<contractAddresses:csv>)
  AND e.topic_0 in ($<eventSignatureHashes:csv>)
  AND e.block_number >= $<startBlock>
  AND e.block_number <= $<endBlock>
`,
  specific1: `
SELECT
  encode(e.transaction_hash, 'hex') AS transaction_hash,
  e.log_index,
  encode(e.contract_address, 'hex') AS contract_address,
  encode(e.topic_0, 'hex') AS topic_0,
  encode(e.topic_1, 'hex') AS topic_1,
  encode(e.topic_2, 'hex') AS topic_2,
  encode(e.topic_3, 'hex') AS topic_3,
  encode(e.data, 'hex') AS data,
  e.block_time,
  e.block_number,
  encode(e.block_hash, 'hex') AS block_hash
FROM
  ethereum.event_logs e
WHERE
  e.contract_address in ($<contractAddresses:csv>)
  AND e.topic_0 in ($<eventSignatureHashes:csv>)
  AND e.topic_1 = '\\x0000000000000000000000000000000000000000000000000000000000000000'
  AND e.block_number >= $<startBlock>
  AND e.block_number <= $<endBlock>
`,
  specific2: `
SELECT
  encode(e.transaction_hash, 'hex') AS transaction_hash,
  e.log_index,
  encode(e.contract_address, 'hex') AS contract_address,
  encode(e.topic_0, 'hex') AS topic_0,
  encode(e.topic_1, 'hex') AS topic_1,
  encode(e.topic_2, 'hex') AS topic_2,
  encode(e.topic_3, 'hex') AS topic_3,
  encode(e.data, 'hex') AS data,
  e.block_time,
  e.block_number,
  encode(e.block_hash, 'hex') AS block_hash
FROM
  ethereum.event_logs e
WHERE
  e.contract_address in ($<contractAddresses:csv>)
  AND e.topic_0 in ($<eventSignatureHashes:csv>)
  AND e.topic_2 = '\\x0000000000000000000000000000000000000000000000000000000000000000'
  AND e.block_number >= $<startBlock>
  AND e.block_number <= $<endBlock>
`,
  specific3: `
SELECT
  encode(e.transaction_hash, 'hex') AS transaction_hash,
  e.log_index,
  encode(e.contract_address, 'hex') AS contract_address,
  encode(e.topic_0, 'hex') AS topic_0,
  encode(e.topic_1, 'hex') AS topic_1,
  encode(e.topic_2, 'hex') AS topic_2,
  encode(e.topic_3, 'hex') AS topic_3,
  encode(e.data, 'hex') AS data,
  e.block_time,
  e.block_number,
  encode(e.block_hash, 'hex') AS block_hash,
  encode(t.from_address, 'hex') AS from_address
FROM
  ethereum.event_logs e
  LEFT JOIN ethereum.transactions t ON e.transaction_hash = t.hash
WHERE
  e.contract_address in ($<contractAddresses:csv>)
  AND e.topic_0 in ($<eventSignatureHashes:csv>)
  AND e.block_number >= $<startBlock>
  AND e.block_number <= $<endBlock>
`,
};

const getEvents = async (task, startBlock, endBlock, config) => {
  const query = config.version ? queries[config.version] : queries.generic;

  const eventSignatureHashes = config.events.map(
    (e) => `\\${e.signatureHash.slice(1)}`
  );
  const contractAddresses = config.contracts.map((c) => `\\${c.slice(1)}`);

  const response = await task.query(minify(query, { compress: false }), {
    startBlock,
    endBlock,
    eventSignatureHashes,
    contractAddresses,
  });

  if (!response) {
    return new Error('getEvents failed', 404);
  }

  return response;
};

const buildInsertQ = (payload) => {
  const columns = [
    'transaction_hash',
    'log_index',
    'contract_address',
    'topic_0',
    'block_time',
    'block_number',
    'collection',
    'token_id',
    'creator',
    'exchange_name',
  ];

  const cs = new pgp.helpers.ColumnSet(columns, {
    // column set requries tablename if schema is not undefined
    table: new pgp.helpers.TableName({
      schema: 'ethereum',
      table: 'nft_creator',
    }),
  });

  const query = pgp.helpers.insert(payload, cs);

  return query;
};

const insertCreator = async (payload) => {
  const query = buildInsertQ(payload);

  const response = await indexa.result(query);

  if (!response) {
    return new Error(`Couldn't insert into ethereum.nft_creator`, 404);
  }

  return response;
};

module.exports = {
  getEvents,
  insertCreator,
};
