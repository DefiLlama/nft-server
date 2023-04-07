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
        ethereum.nft_trades_clean
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
  WITH sales AS (SELECT
      EXTRACT(EPOCH FROM block_time) AS block_time,
      eth_sale_price
  FROM
      ethereum.nft_trades_clean
  WHERE
      collection = $<collectionId>
      ${
        lb
          ? "AND encode(token_id, 'escape')::numeric BETWEEN $<lb> AND $<ub>"
          : ''
      }
  )
  SELECT *
  FROM
      sales
  WHERE
      (SELECT COUNT(*) FROM sales) <= 30000 OR RANDOM() <= 0.5;
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
    SUM(eth_sale_price)
FROM
    ethereum.nft_trades_clean
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

// get 1day,7day volumes per collection
const getVolume = async () => {
  const conn = await connect(db);

  const query = minify(`
WITH volumes AS (SELECT
    CONCAT('0x', encode(collection, 'hex')) as collection,
    SUM(CASE WHEN block_time >= (NOW() - INTERVAL '1 DAY') THEN eth_sale_price END) AS "1day_volume",
    SUM(CASE WHEN block_time >= (NOW() - INTERVAL '7 DAY') THEN eth_sale_price END) AS "7day_volume"
FROM
    ethereum.nft_trades_clean
GROUP BY
    collection)
SELECT * FROM volumes WHERE "7day_volume" > 0
  `);

  const response = await conn.query(query);

  if (!response) {
    return new Error(`Couldn't get data`, 404);
  }

  return response.map((c) => convertKeysToCamelCase(c));
};

// Name mapping plus marketplace urls -> should go into new table
const mapping = {
  blur: 'Blur',
  'alpha sharks': 'AlphaSharks',
  'magic eden': 'Magic Eden',
  x2y2: 'X2Y2',
  okx: 'OKX',
  'tiny astro': 'Tiny Astro',
};

const formatName = (exchange_name) => {
  let [n, agg] = exchange_name.split('-');
  n = mapping[n] ?? n.charAt(0).toUpperCase() + n.slice(1);
  return agg ? n + ' Aggregator' : n;
};

const getExchangeStats = async () => {
  const conn = await connect(db);

  const query = minify(`
WITH nft_trades_processed AS (
  SELECT
    LOWER(encode(exchange_name, 'escape')) AS exchange_name,
    LOWER(encode(aggregator_name, 'escape')) AS aggregator_name,
    block_time,
    eth_sale_price
  FROM
    ethereum.nft_trades_clean
  WHERE block_time >= NOW() - INTERVAL '14 DAY'
),
  trades_ AS (
    SELECT
      CASE
        WHEN exchange_name = aggregator_name THEN exchange_name || '-aggregator'
        WHEN aggregator_name IS NULL THEN exchange_name
        ELSE aggregator_name
      END AS exchange_name,
        block_time,
        eth_sale_price
    FROM
      nft_trades_processed
  ),
grouped AS (
  SELECT
    exchange_name,
    SUM(CASE WHEN block_time >= (NOW() - INTERVAL '1 DAY') THEN eth_sale_price END) AS "1day_volume",
    SUM(CASE WHEN block_time >= (NOW() - INTERVAL '7 DAY') THEN eth_sale_price END) AS "7day_volume",
    SUM(CASE WHEN block_time >= (NOW() - INTERVAL '14 DAY') AND block_time < (NOW() - INTERVAL '7 DAY') THEN eth_sale_price END) AS "7day_volume_prior",
    COUNT(CASE WHEN block_time >= (NOW() - INTERVAL '1 DAY') THEN eth_sale_price END) AS "1day_nb_trades",
    COUNT(CASE WHEN block_time >= (NOW() - INTERVAL '7 DAY') THEN eth_sale_price END) AS "7day_nb_trades"
  FROM
    trades_
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
  g."1day_nb_trades",
  g."7day_nb_trades",
  (g."1day_volume" / tdv.total_1day_volume) * 100 AS pct_of_total,
  g."7day_volume_prior",
  (g."7day_volume" - g."7day_volume_prior") / g."7day_volume_prior" * 100 AS weekly_change
FROM
  grouped g,
  total_daily_volume tdv;
`);

  const trades = await conn.query(query, {
    tableName: '"ethereum"."nft_trades"',
  });

  const trades_clean = await conn.query(query, {
    tableName: '"ethereum"."nft_trades_clean"',
  });

  const response = trades_clean.map((m_clean) => ({
    ...m_clean,
    wash_volume7d_pct:
      (1 -
        m_clean['7day_volume'] /
          trades.find((m) => m.exchange_name === m_clean.exchange_name)?.[
            '7day_volume'
          ]) *
      100,
  }));

  if (!response) {
    return new Error(`Couldn't get data`, 404);
  }

  return response
    .map((i) => ({ ...i, exchange_name: formatName(i.exchange_name) }))
    .map((c) => convertKeysToCamelCase(c));
};

const getExchangeVolume = async () => {
  const conn = await connect(db);

  const query = minify(`
WITH trades AS (
    SELECT
      block_time,
      LOWER(encode(exchange_name, 'escape')) AS exchange_name,
      LOWER(encode(aggregator_name, 'escape')) AS aggregator_name,
      eth_sale_price
    FROM
      ethereum.nft_trades_clean
  ),
  trades_ AS (
    SELECT
      CASE
        WHEN exchange_name = aggregator_name THEN exchange_name || '-aggregator'
        WHEN aggregator_name IS NULL THEN exchange_name
        ELSE aggregator_name
      END AS exchange_name,
        block_time,
        eth_sale_price
    FROM
      trades
  )
  SELECT
    DATE(block_time) AS day,
    exchange_name,
    SUM(eth_sale_price)
  FROM
    trades_
  GROUP BY
    DATE(block_time),
    exchange_name;
`);

  const response = await conn.query(query);

  if (!response) {
    return new Error(`Couldn't get data`, 404);
  }

  return response
    .map((i) => ({ ...i, exchange_name: formatName(i.exchange_name) }))
    .map((c) => convertKeysToCamelCase(c));
};

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
