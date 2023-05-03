const minify = require('pg-minify');

const { pgp, indexa } = require('../utils/dbConnection');

const query = `
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
  b.price,
  encode(t.to_address, 'hex') AS to_address,
  encode(t.from_address, 'hex') AS from_address,
  a.name AS aggregator_name
FROM
  ethereum.event_logs e
  LEFT JOIN ethereum.blocks b ON e.block_time = b.time
  LEFT JOIN ethereum.transactions t ON e.transaction_hash = t.hash
  LEFT JOIN ethereum.nft_aggregators_appendage a ON RIGHT(encode(t.data, 'hex'), a.appendage_length) = encode(a.appendage, 'escape')
WHERE
  e.contract_address in ($<contractAddresses:csv>)
  AND e.topic_0 in ($<eventSignatureHashes:csv>)
  AND e.block_number >= $<startBlock>
  AND e.block_number <= $<endBlock>
`;

// opensea-wyvern & rarible events do not contain collection and tokenId, hence we need to also
// query nft transfer events
const queryExtensive = `
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
    b.price,
    encode(t.from_address, 'hex') AS from_address,
    encode(t.to_address, 'hex') AS to_address,
    a.name AS aggregator_name
FROM
    ethereum.event_logs e
    LEFT JOIN ethereum.blocks b ON e.block_time = b.time
    LEFT JOIN ethereum.transactions t ON e.transaction_hash = t.hash
    LEFT JOIN ethereum.nft_aggregators_appendage a ON RIGHT(encode(t.data, 'hex'), a.appendage_length) = encode(a.appendage, 'escape')
WHERE
    (
        (
            e.contract_address IN ($<contractAddresses:csv>)
            AND e.topic_0 IN ($<eventSignatureHashes:csv>)
        )
        OR (
            e.topic_0 = '\\xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef'
            AND topic_3 IS NOT NULL
        )
        OR (
          e.topic_0 = '\\xc3d58168c5ae7397731d063d5bbf3d657854427343f4c083240f7aacaa2d0f62'
      )
    )
    AND e.block_number >= $<startBlock>
    AND e.block_number <= $<endBlock>
`;

// like queryExtensive but:
// + tx input data (tx_data)
// + however cryptopunks = erc20 (we filter for cryptpunks emitted erc20's transfer events)
// so we read erc20 transfer events
const queryCryptopunks = `
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
    b.price,
    encode(t.from_address, 'hex') AS from_address,
    encode(t.to_address, 'hex') AS to_address,
    encode(t.data, 'hex') AS tx_data,
    a.name AS aggregator_name
FROM
    ethereum.event_logs e
    LEFT JOIN ethereum.blocks b ON e.block_time = b.time
    LEFT JOIN ethereum.transactions t ON e.transaction_hash = t.hash
    LEFT JOIN ethereum.nft_aggregators_appendage a ON RIGHT(encode(t.data, 'hex'), a.appendage_length) = encode(a.appendage, 'escape')
WHERE
    (
        (
            e.contract_address IN ($<contractAddresses:csv>)
            AND e.topic_0 IN ($<eventSignatureHashes:csv>)
        )
        OR (
            contract_address = '\\xb47e3cd837ddf8e4c57f05d70ab865de6e193bbb'
            AND e.topic_0 = '\\xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef'
            AND topic_3 IS NULL

        )
    )
    AND e.block_number >= $<startBlock>
    AND e.block_number <= $<endBlock>
`;

const queryLooksrareV1 = `
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
    b.price,
    encode(t.from_address, 'hex') AS from_address,
    encode(t.to_address, 'hex') AS to_address,
    a.name AS aggregator_name
FROM
    ethereum.event_logs e
    LEFT JOIN ethereum.blocks b ON e.block_time = b.time
    LEFT JOIN ethereum.transactions t ON e.transaction_hash = t.hash
    LEFT JOIN ethereum.nft_aggregators_appendage a ON RIGHT(encode(t.data, 'hex'), a.appendage_length) = encode(a.appendage, 'escape')
WHERE
    (
        (
            e.contract_address IN ($<contractAddresses:csv>)
            AND e.topic_0 IN ($<eventSignatureHashes:csv>)
        )
        OR (
            e.topic_0 = '\\x27c4f0403323142b599832f26acd21c74a9e5b809f2215726e244a4ac588cd7d'
        )
    )
    AND e.block_number >= $<startBlock>
    AND e.block_number <= $<endBlock>
`;

// we pass in a pgp task, this way we can share a single db connection to indexa inside a Promise.all
// which doesn't work with conn.query
const getEvents = async (task, startBlock, endBlock, config) => {
  const eventSignatureHashes = config.events.map(
    (e) => `\\${e.signatureHash.slice(1)}`
  );
  const contractAddresses = config.contracts.map((c) => `\\${c.slice(1)}`);

  const q =
    ['rarible', 'zora'].includes(config.exchangeName) ||
    config.version === 'wyvern'
      ? queryExtensive
      : config.exchangeName === 'cryptopunks'
      ? queryCryptopunks
      : config.version === 'looksrare-v1'
      ? queryLooksrareV1
      : query;

  const response = await task.query(minify(q, { compress: false }), {
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

const getMaxBlock = async (task, table) => {
  const query = minify(
    `
SELECT
    MAX(block_number)
FROM
    $<table:raw>
  `,
    { compress: true }
  );

  const response = await task.query(query, { table });

  if (!response) {
    return new Error('getMaxBlock failed', 404);
  }

  return response[0].max;
};

const buildInsertQ = (payload) => {
  const columns = [
    'transaction_hash',
    'log_index',
    'contract_address',
    'topic_0',
    'block_time',
    'block_number',
    'exchange_name',
    'collection',
    'token_id',
    'amount',
    'sale_price',
    'eth_sale_price',
    'usd_sale_price',
    'payment_token',
    'seller',
    'buyer',
    'aggregator_name',
    'aggregator_address',
  ];

  const cs = new pgp.helpers.ColumnSet(columns, {
    // column set requries tablename if schema is not undefined
    table: new pgp.helpers.TableName({
      schema: 'ethereum',
      table: 'nft_trades',
    }),
  });

  const query = pgp.helpers.insert(payload, cs);

  return query;
};

const insertTrades = async (payload) => {
  const query = buildInsertQ(payload);

  const response = await indexa.result(query);

  if (!response) {
    return new Error(`Couldn't insert into ethereum.nft_trades`, 404);
  }

  return response;
};

// used when refilling (in case of adapter bug, missing events etc)
// deletes trades in nft_trades for a given marketplace (its address(es), event signatures and block range)
const buildDeleteQ = () => {
  const query = `
  DELETE FROM
      ethereum.nft_trades
  WHERE
      contract_address in ($<contractAddresses:csv>)
      AND topic_0 in ($<eventSignatureHashes:csv>)
      AND block_number >= $<startBlock>
      AND block_number <= $<endBlock>
  `;

  return query;
};

// --------- transaction query
const deleteAndInsertTrades = async (payload, config, startBlock, endBlock) => {
  // build queries
  const deleteQuery = buildDeleteQ();
  const insertQuery = buildInsertQ(payload);

  // required for the delteteQ
  const eventSignatureHashes = config.events.map(
    (e) => `\\${e.signatureHash.slice(1)}`
  );
  const contractAddresses = config.contracts.map((c) => `\\${c.slice(1)}`);

  return indexa
    .tx(async (t) => {
      // sequence of queries:
      // 1. delete trades
      const q1 = await t.result(deleteQuery, {
        contractAddresses,
        eventSignatureHashes,
        startBlock,
        endBlock,
      });

      // 2. insert trades
      const q2 = await t.result(insertQuery);

      return [q1, q2];
    })
    .then((response) => {
      // success, COMMIT was executed
      return {
        status: 'success',
        data: response,
      };
    })
    .catch((err) => {
      // failure, ROLLBACK was executed
      console.log(err);
      return new Error('Transaction failed, rolling back', 404);
    });
};

const insertWashTrades = async (start, stop) => {
  const query = minify(`
INSERT INTO ethereum.nft_wash_trades (transaction_hash, log_index)
WITH counted_trades AS (
    SELECT
        transaction_hash,
        log_index,
        buyer,
        seller,
        collection,
        token_id,
        COUNT(*) OVER (PARTITION BY seller, collection, token_id) AS seller_count,
        COUNT(*) OVER (PARTITION BY buyer, collection, token_id) AS buyer_count
    FROM
        ethereum.nft_trades as trades
    WHERE
        block_number BETWEEN $<start>
        AND $<stop>
        AND NOT EXISTS (
          SELECT 1
          FROM ethereum.nft_wash_trades as fake_trades
          WHERE fake_trades.transaction_hash = trades.transaction_hash
            AND fake_trades.log_index = trades.log_index
        )
)
SELECT
    transaction_hash,
    log_index
FROM
    counted_trades
LEFT JOIN
    ethereum.nft_collections nc ON counted_trades.collection = nc.collection
WHERE
    buyer = seller
    OR EXISTS (
        SELECT
            1
        FROM
            ethereum.nft_trades t
        WHERE
            t.seller = counted_trades.buyer
            AND t.buyer = counted_trades.seller
            AND t.collection = counted_trades.collection
            AND t.token_id = counted_trades.token_id
            AND t.transaction_hash <> counted_trades.transaction_hash
    )
    OR (
      (seller_count >= 3 OR buyer_count >= 3)
      AND token_standard = 'erc721'
  )
  `);

  const response = await indexa.result(query, { start, stop });

  if (!response) {
    return new Error(`Couldn't insert into ethereum.nft_wash_trades`, 404);
  }

  return response;
};

module.exports = {
  getEvents,
  getMaxBlock,
  insertTrades,
  deleteAndInsertTrades,
  insertWashTrades,
};
