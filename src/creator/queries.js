const minify = require('pg-minify');

const { convertKeysToCamelCase } = require('../utils/keyConversion');
const { pgp, indexa } = require('../utils/dbConnection');

const generic = `
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
`;

const specific = `
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
`;

const getEvents = async (task, startBlock, endBlock, config) => {
  const query =
    config.version === 'rarible-transfer' || config.exchangeName === 'superrare'
      ? specific
      : generic;

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

const limit = 100;

const getCollectionWithoutCreator = async () => {
  const query = minify(`
    SELECT
        DISTINCT ON (collection, token_id)
        encode(exchange_name, 'escape') AS exchange_name,
        '0x' || encode(collection, 'hex') AS collection,
        encode(token_id, 'escape') AS token_id
    FROM
        ethereum.nft_history h
    WHERE
        NOT EXISTS (
            SELECT
                1
            FROM
                ethereum.nft_creator c
            WHERE
                c.collection = h.collection
                AND c.token_id = h.token_id
        )
        AND collection IN ($<sharedContracts:csv>)
    ORDER BY
        collection,
        token_id,
        block_number ASC,
        log_index ASC
    LIMIT $<limit>
      `);

  const response = await indexa.query(query, {
    sharedContracts: [
      '0x3b3ee1931dc30c1957379fac9aba94d1c48a5405',
      '0x41a322b28d0ff354040e2cbc676f0320d8c8850d',
      '0xb932a70a57673d89f4acffbe830e8ed7f75fb9e0',
      '0xcd51b81ac1572707b7f3051aa97a31e2afb27d45',
      '0x2963ba471e265e5f51cafafca78310fe87f8e6d1',
      '0x2a46f2ffd99e19a89476e2f62270e0a35bbf0756',
      '0xabefbc9fd2f806065b4f3c237d4b59d9a97bcac7',
      '0xdde2d979e8d39bb8416eafcfc1758f3cab2c9c72',
      '0xfbeef911dc5821886e1dda71586d90ed28174b7d',
      '0xabb3738f04dc2ec20f4ae4462c3d069d02ae045b',
    ].map((c) => `\\${c.slice(1)}`),
    limit,
  });

  if (!response) {
    return new Error('getEvents failed', 404);
  }

  return response.map((c) => convertKeysToCamelCase(c));
};

const buildInsertQ = (payload) => {
  const columns = ['collection', 'token_id', 'creator'];

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
  getCollectionWithoutCreator,
  insertCreator,
  limit,
};
