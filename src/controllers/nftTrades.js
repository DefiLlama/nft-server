const minify = require('pg-minify');

const { pgp, connect } = require('../utils/dbConnection');
const { convertKeysToCamelCase } = require('../utils/keyConversion');

const db = 'indexa';
const schema = 'ethereum';
const table = 'nft_trades';

const getMaxBlock = async (table) => {
  const conn = await connect(db);

  const query = minify(
    `
SELECT
    MAX(block_number)
FROM
    $<table:raw>
  `,
    { compress: true }
  );

  const response = await conn.query(query, { table });

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
      schema,
      table,
    }),
  });

  const query = pgp.helpers.insert(payload, cs);

  return query;
};

const insertTrades = async (payload) => {
  const conn = await connect(db);

  const query = buildInsertQ(payload);

  const response = await conn.result(query);

  if (!response) {
    return new Error(`Couldn't insert into ${schema}.${table}`, 404);
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
  const conn = await connect(db);

  // build queries
  const deleteQuery = buildDeleteQ();
  const insertQuery = buildInsertQ(payload);

  // required for the delteteQ
  const eventSignatureHashes = config.events.map(
    (e) => `\\${e.signatureHash.slice(1)}`
  );
  const contractAddresses = config.contracts.map((c) => `\\${c.slice(1)}`);

  return conn
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

// get all sales for a given collectionId
const getSales = async (collectionId) => {
  const conn = await connect(db);

  let lb, ub;
  // artblocks
  if (collectionId.includes(':')) {
    [collectionId, lb, ub] = collectionId.split(':');
  }

  const query = minify(`
    SELECT
        encode(transaction_hash, 'hex') AS transaction_hash,
        block_time,
        block_number,
        encode(exchange_name, 'escape') AS exchange_name,
        encode(token_id, 'escape') AS token_id,
        sale_price,
        eth_sale_price,
        usd_sale_price,
        encode(seller, 'hex') AS seller,
        encode(buyer, 'hex') AS buyer,
        encode(aggregator_name, 'escape') AS aggregator_name,
        encode(aggregator_address, 'hex') AS aggregator_address
    FROM
        ethereum.nft_trades
    WHERE
        collection = $<collectionId>
        ${
          lb
            ? "AND encode(token_id, 'escape')::numeric BETWEEN $<lb> AND $<ub>"
            : ''
        }
  `);

  const response = await conn.query(query, {
    collectionId: `\\${collectionId.slice(1)}`,
    lb: Number(lb),
    ub: Number(ub),
  });

  if (!response) {
    return new Error(`Couldn't get data`, 404);
  }

  return response.map((c) => convertKeysToCamelCase(c));
};

const getSalesLite = async (collectionId) => {
  const conn = await connect(db);

  let lb, ub;
  // artblocks
  if (collectionId.includes(':')) {
    [collectionId, lb, ub] = collectionId.split(':');
  }

  const query = minify(`
    SELECT
        block_time,
        eth_sale_price
    FROM
        ethereum.nft_trades
    WHERE
        collection = $<collectionId>
        ${
          lb
            ? "AND encode(token_id, 'escape')::numeric BETWEEN $<lb> AND $<ub>"
            : ''
        }
  `);

  const response = await conn.query(query, {
    collectionId: `\\${collectionId.slice(1)}`,
    lb: Number(lb),
    ub: Number(ub),
  });

  if (!response) {
    return new Error(`Couldn't get data`, 404);
  }

  return response.map((c) => [c.block_time, c.eth_sale_price]);
};

// get daily aggregated statistics such as volume, sale count per day for a given collectionId
const getStats = async (collectionId) => {
  const conn = await connect(db);

  let lb, ub;
  // artblocks
  if (collectionId.includes(':')) {
    [collectionId, lb, ub] = collectionId.split(':');
  }

  const query = minify(`
SELECT
    DATE(block_time) AS day,
    SUM(eth_sale_price),
    COUNT(eth_sale_price)
FROM
    ethereum.nft_trades
WHERE
    collection = $<collectionId>
        ${
          lb
            ? "AND encode(token_id, 'escape')::numeric BETWEEN $<lb> AND $<ub>"
            : ''
        }
GROUP BY
    DATE(block_time)
ORDER BY
    DATE(block_time) ASC;
`);

  const response = await conn.query(query, {
    collectionId: `\\${collectionId.slice(1)}`,
    lb: Number(lb),
    ub: Number(ub),
  });

  if (!response) {
    return new Error(`Couldn't get data`, 404);
  }

  return response.map((c) => convertKeysToCamelCase(c));
};

// get 1day,7day,30day volumes per collection
const getVolume = async () => {
  const conn = await connect(db);

  const query = minify(`
SELECT
    encode(collection, 'hex') as collection,
    SUM(CASE WHEN block_time >= (NOW() - INTERVAL '1 DAY') THEN eth_sale_price END) AS "1day_volume",
    SUM(CASE WHEN block_time >= (NOW() - INTERVAL '7 DAY') THEN eth_sale_price END) AS "7day_volume",
    SUM(CASE WHEN block_time >= (NOW() - INTERVAL '30 DAY') THEN eth_sale_price END) AS "30day_volume"
FROM
    ethereum.nft_trades
GROUP BY
    collection;
  `);

  const response = await conn.query(query);

  if (!response) {
    return new Error(`Couldn't get data`, 404);
  }

  return response
    .map((c) => convertKeysToCamelCase(c))
    .map((c) => ({ ...c, collection: `0x${c.collection}` }));
};

const getExchangeStats = async () => {
  const conn = await connect(db);

  const query = minify(`
WITH nft_trades_processed AS (
  SELECT
    LOWER(encode(COALESCE(aggregator_name, exchange_name), 'escape')) AS exchange_name,
    block_time,
    eth_sale_price
  FROM
    ethereum.nft_trades
),
grouped AS (
  SELECT
    exchange_name,
    SUM(CASE WHEN block_time >= (NOW() - INTERVAL '1 DAY') THEN eth_sale_price END) AS "1day_volume",
    SUM(CASE WHEN block_time >= (NOW() - INTERVAL '7 DAY') THEN eth_sale_price END) AS "7day_volume",
    SUM(CASE WHEN block_time >= (NOW() - INTERVAL '30 DAY') THEN eth_sale_price END) AS "30day_volume",
    SUM(CASE WHEN block_time >= (NOW() - INTERVAL '14 DAY') AND block_time < (NOW() - INTERVAL '7 DAY') THEN eth_sale_price END) AS "7day_volume_prior",
    COUNT(CASE WHEN block_time >= (NOW() - INTERVAL '1 DAY') THEN eth_sale_price END) AS "1day_nb_trades",
    COUNT(CASE WHEN block_time >= (NOW() - INTERVAL '7 DAY') THEN eth_sale_price END) AS "7day_nb_trades",
    COUNT(CASE WHEN block_time >= (NOW() - INTERVAL '30 DAY') THEN eth_sale_price END) AS "30day_nb_trades"
  FROM
    nft_trades_processed
  GROUP BY
    exchange_name
),
total_daily_volume AS (
  SELECT
    SUM("1day_volume") AS total_1day_volume
  FROM
    grouped
)
SELECT
  g.exchange_name,
  g."1day_volume",
  g."7day_volume",
  g."30day_volume",
  g."1day_nb_trades",
  g."7day_nb_trades",
  g."30day_nb_trades",
  (g."1day_volume" / tdv.total_1day_volume) * 100 AS pct_of_total,
  g."7day_volume_prior",
  (g."7day_volume" - g."7day_volume_prior") / g."7day_volume_prior" * 100 AS weekly_change
FROM
  grouped g,
  total_daily_volume tdv;
`);

  const response = await conn.query(query);

  if (!response) {
    return new Error(`Couldn't get data`, 404);
  }
  return response.map((c) => convertKeysToCamelCase(c));
};

const getExchangeVolume = async () => {
  const conn = await connect(db);

  const query = minify(`
WITH trades AS (
    SELECT
      block_time,
      LOWER(encode(COALESCE(aggregator_name, exchange_name), 'escape')) AS exchange_name,
      eth_sale_price
    FROM
      ethereum.nft_trades
  )
  SELECT
    DATE(block_time) AS day,
    exchange_name,
    SUM(eth_sale_price)
  FROM
    trades
  GROUP BY
    DATE(block_time),
    exchange_name;
`);

  const response = await conn.query(query);

  if (!response) {
    return new Error(`Couldn't get data`, 404);
  }
  return response.map((c) => convertKeysToCamelCase(c));
};

const queryWashTrade = minify(`
WITH counted_trades AS (
  SELECT
      *,
      COUNT(*) OVER (PARTITION BY seller, collection, token_id) AS seller_count,
      COUNT(*) OVER (PARTITION BY buyer, collection, token_id) AS buyer_count
  FROM
      ethereum.nft_trades
)
SELECT
  *
FROM
  counted_trades
WHERE
  NOT EXISTS (
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
  AND buyer != seller
  AND seller_count < 3
  AND buyer_count < 3
`);

module.exports = {
  getMaxBlock,
  insertTrades,
  deleteAndInsertTrades,
  getSales,
  getSalesLite,
  getStats,
  getVolume,
  getExchangeStats,
  getExchangeVolume,
};
