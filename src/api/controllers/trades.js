const minify = require('pg-minify');

const checkCollection = require('../../utils/checkAddress');
const { convertKeysToCamelCase } = require('../../utils/keyConversion');
const customHeader = require('../../utils/customHeader');
const { indexa } = require('../../utils/dbConnection');

const getSales = async (req, res) => {
  let collectionId = req.params.collectionId;
  if (!checkCollection(collectionId))
    return res.status(400).json('invalid collectionId!');

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
      ethereum.nft_trades AS t
  WHERE
      collection = $<collectionId>
      AND block_time >= '2023-01-01 00:00'
      ${
        lb
          ? "AND encode(token_id, 'escape')::numeric BETWEEN $<lb> AND $<ub>"
          : ''
      }
      AND NOT EXISTS (
        SELECT 1
        FROM ethereum.nft_wash_trades AS wt
        WHERE wt.transaction_hash = t.transaction_hash
          AND wt.log_index = t.log_index
      )
      AND NOT EXISTS (
        SELECT 1
        FROM ethereum.nft_trades_blacklist AS b
        WHERE t.transaction_hash = b.transaction_hash
      )
    )
  SELECT distinct *
  FROM
      sales
  WHERE
      (SELECT COUNT(*) FROM sales) <= 30000 OR RANDOM() <= 0.5;
`);

  const response = await indexa.query(query, {
    collectionId: `\\${collectionId.slice(1)}`,
    lb: Number(lb),
    ub: Number(ub),
  });

  if (!response) {
    return new Error(`Couldn't get data`, 404);
  }

  res
    .set(customHeader())
    .status(200)
    .json(response.map((c) => [c.block_time, c.eth_sale_price]));
};

// get daily aggregated statistics such as volume, sale count per day for a given collectionId
const getStats = async (req, res) => {
  let collectionId = req.params.collectionId;
  if (!checkCollection(collectionId))
    return res.status(400).json('invalid collectionId!');

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
    ethereum.nft_trades AS t
WHERE
    collection = $<collectionId>
    AND block_time >= '2023-01-01 00:00'
        ${
          lb
            ? "AND encode(token_id, 'escape')::numeric BETWEEN $<lb> AND $<ub>"
            : ''
        }
    AND NOT EXISTS (
      SELECT 1
      FROM ethereum.nft_wash_trades AS wt
      WHERE wt.transaction_hash = t.transaction_hash
        AND wt.log_index = t.log_index
    )
    AND NOT EXISTS (
      SELECT 1
      FROM ethereum.nft_trades_blacklist AS b
      WHERE t.transaction_hash = b.transaction_hash
    )
GROUP BY
    DATE(block_time)
ORDER BY
    DATE(block_time) ASC;
`);

  const response = await indexa.query(query, {
    collectionId: `\\${collectionId.slice(1)}`,
    lb: Number(lb),
    ub: Number(ub),
  });

  if (!response) {
    return new Error(`Couldn't get data`, 404);
  }

  res
    .set(customHeader())
    .status(200)
    .json(response.map((c) => convertKeysToCamelCase(c)));
};

// get 1day,7day volumes per collection
const getVolume = async (req, res) => {
  const query = minify(`
WITH volumes AS (SELECT
    CONCAT('0x', encode(collection, 'hex')) as collection,
    SUM(CASE WHEN block_time >= (NOW() - INTERVAL '1 DAY') THEN eth_sale_price END) AS "1day_volume",
    SUM(CASE WHEN block_time >= (NOW() - INTERVAL '7 DAY') THEN eth_sale_price END) AS "7day_volume",
    COUNT(CASE WHEN block_time >= (NOW() - INTERVAL '1 DAY') THEN eth_sale_price END) AS "1day_sales"
FROM
    ethereum.nft_trades AS t
WHERE
  NOT EXISTS (
    SELECT 1
    FROM ethereum.nft_wash_trades AS wt
    WHERE wt.transaction_hash = t.transaction_hash
      AND wt.log_index = t.log_index
  )
  AND NOT EXISTS (
    SELECT 1
    FROM ethereum.nft_trades_blacklist AS b
    WHERE t.transaction_hash = b.transaction_hash
  )
GROUP BY
    collection)
SELECT * FROM volumes WHERE "7day_volume" > 0
  `);

  const response = await indexa.query(query);

  if (!response) {
    return new Error(`Couldn't get data`, 404);
  }

  res
    .set(customHeader())
    .status(200)
    .json(response.map((c) => convertKeysToCamelCase(c)));
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

const getExchangeStats = async (req, res) => {
  const query = minify(`
WITH nft_trades_processed AS (
  SELECT
    LOWER(encode(exchange_name, 'escape')) AS exchange_name,
    LOWER(encode(aggregator_name, 'escape')) AS aggregator_name,
    block_time,
    eth_sale_price,
    usd_sale_price
  FROM
    ethereum.nft_trades AS t
  WHERE
    block_time >= NOW() - INTERVAL '14 DAY'
    AND NOT EXISTS (
      SELECT 1
      FROM ethereum.nft_trades_blacklist AS b
      WHERE t.transaction_hash = b.transaction_hash
    )
    AND (
      CASE WHEN $<condition> = 'clean' THEN
      NOT EXISTS (
        SELECT 1
        FROM ethereum.nft_wash_trades AS wt
        WHERE wt.transaction_hash = t.transaction_hash
          AND wt.log_index = t.log_index
      )
      ELSE
        1 = 1
      END
    )
),
  trades_ AS (
    SELECT
      CASE
        WHEN exchange_name = aggregator_name THEN exchange_name || '-aggregator'
        WHEN aggregator_name IS NULL THEN exchange_name
        ELSE aggregator_name
      END AS exchange_name,
        block_time,
        eth_sale_price,
        usd_sale_price
    FROM
      nft_trades_processed
  ),
grouped AS (
  SELECT
    exchange_name,
    SUM(CASE WHEN block_time >= (NOW() - INTERVAL '1 DAY') THEN eth_sale_price END) AS "1day_volume",
    SUM(CASE WHEN block_time >= (NOW() - INTERVAL '7 DAY') THEN eth_sale_price END) AS "7day_volume",
    SUM(CASE WHEN block_time >= (NOW() - INTERVAL '1 DAY') THEN usd_sale_price END) AS "1day_volume_usd",
    SUM(CASE WHEN block_time >= (NOW() - INTERVAL '7 DAY') THEN usd_sale_price END) AS "7day_volume_usd",
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
  g."1day_volume_usd",
  g."7day_volume_usd",
  g."1day_nb_trades",
  g."7day_nb_trades",
  (g."1day_volume" / tdv.total_1day_volume) * 100 AS pct_of_total,
  g."7day_volume_prior",
  (g."7day_volume" - g."7day_volume_prior") / g."7day_volume_prior" * 100 AS weekly_change
FROM
  grouped g,
  total_daily_volume tdv;
`);

  const trades = await indexa.query(query, { condition: 'raw' });

  const trades_clean = await indexa.query(query, { condition: 'clean' });

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

  res
    .set(customHeader())
    .status(200)
    .json(
      response
        .map((i) => ({ ...i, exchange_name: formatName(i.exchange_name) }))
        .map((c) => convertKeysToCamelCase(c))
    );
};

const getExchangeVolume = async (req, res) => {
  const query = minify(`
  WITH trades AS (
    SELECT
      block_time,
      LOWER(encode(exchange_name, 'escape')) AS exchange_name,
      LOWER(encode(aggregator_name, 'escape')) AS aggregator_name,
      eth_sale_price,
      usd_sale_price
    FROM
      ethereum.nft_trades AS t
    WHERE
      block_time >= '2023-01-01 00:00'
      AND NOT EXISTS (
        SELECT 1
        FROM ethereum.nft_wash_trades AS wt
        WHERE wt.transaction_hash = t.transaction_hash
          AND wt.log_index = t.log_index
      )
      AND NOT EXISTS (
        SELECT 1
        FROM ethereum.nft_trades_blacklist AS b
        WHERE t.transaction_hash = b.transaction_hash
      )
  ),
  trades_ AS (
    SELECT
      CASE
        WHEN exchange_name = aggregator_name THEN exchange_name || '-aggregator'
        WHEN aggregator_name IS NULL THEN exchange_name
        ELSE aggregator_name
      END AS exchange_name,
        block_time,
        eth_sale_price,
        usd_sale_price
    FROM
      trades
  )
  SELECT
    DATE(block_time) AS day,
    exchange_name,
    SUM(eth_sale_price),
    SUM(usd_sale_price) AS sum_usd,
    COUNT(eth_sale_price)
  FROM
    trades_
  GROUP BY
    DATE(block_time),
    exchange_name;
`);

  const response = await indexa.query(query);

  if (!response) {
    return new Error(`Couldn't get data`, 404);
  }

  return res
    .set(customHeader())
    .status(200)
    .json(
      response
        .map((i) => ({ ...i, exchange_name: formatName(i.exchange_name) }))
        .map((c) => convertKeysToCamelCase(c))
    );
};

const getExchangeVolumeView = async (req, res) => {
  const query = minify(`
  SELECT
    *
  FROM
    ethereum.nft_trades_exchange_volume
`);

  const response = await indexa.query(query);

  if (!response) {
    return new Error(`Couldn't get data`, 404);
  }

  return res
    .set(customHeader())
    .status(200)
    .json(
      response
        .map((i) => ({ ...i, exchange_name: formatName(i.exchange_name) }))
        .map((c) => convertKeysToCamelCase(c))
    );
};

const getRoyalties = async (req, res) => {
  const query = minify(`
WITH royalty_stats as (
  SELECT
    encode(t.collection, 'hex') as collection,
    SUM(CASE WHEN block_time >= (NOW() - INTERVAL '1 DAY') THEN royalty_fee_usd END) AS "usd_1d",
    SUM(CASE WHEN block_time >= (NOW() - INTERVAL '7 DAY') THEN royalty_fee_usd END) AS "usd_7d",
    SUM(CASE WHEN block_time >= (NOW() - INTERVAL '30 DAY') THEN royalty_fee_usd END) AS "usd_30d",
    SUM(
      CASE
        WHEN topic_0 = '\\xc4109843e0b7d514e4c093114b863f8e7d8d9a458c372cd51bfe526b588006c9' THEN
          usd_sale_price * royalty_fee_pct / 100
        ELSE
          royalty_fee_usd
      END
    ) AS "usd_lifetime"
  FROM
    ethereum.nft_trades AS t
  JOIN
    ethereum.nft_collections c ON t.collection = c.collection
  GROUP BY
    t.collection
  )
SELECT
  *
FROM
  royalty_stats
WHERE
  usd_lifetime > 10000
ORDER BY
  usd_30d DESC
`);

  const response = await indexa.query(query);

  if (!response) {
    return new Error(`Couldn't get data`, 404);
  }

  res
    .set(customHeader())
    .status(200)
    .json(response.map((c) => convertKeysToCamelCase(c)));
};

const getRoyalty = async (req, res) => {
  let collectionId = req.params.collectionId;
  if (!checkCollection(collectionId))
    return res.status(400).json('invalid collectionId!');

  let lb, ub;
  // artblocks
  if (collectionId.includes(':')) {
    [collectionId, lb, ub] = collectionId.split(':');
  }

  const query = minify(`
SELECT
  SUM(CASE WHEN block_time >= (NOW() - INTERVAL '1 DAY') THEN royalty_fee_usd END) AS "usd_1d",
  SUM(CASE WHEN block_time >= (NOW() - INTERVAL '7 DAY') THEN royalty_fee_usd END) AS "usd_7d",
  SUM(CASE WHEN block_time >= (NOW() - INTERVAL '30 DAY') THEN royalty_fee_usd END) AS "usd_30d",
  SUM(
    CASE
      WHEN topic_0 = '\\xc4109843e0b7d514e4c093114b863f8e7d8d9a458c372cd51bfe526b588006c9' THEN
        usd_sale_price * royalty_fee_pct / 100
      ELSE
        royalty_fee_usd
    END
  ) AS "usd_lifetime"
FROM
  ethereum.nft_trades AS t
JOIN
  ethereum.nft_collections c ON t.collection = c.collection
WHERE
  t.collection = $<collectionId>
  `);

  const response = await indexa.query(query, {
    collectionId: `\\${collectionId.slice(1)}`,
  });

  if (!response) {
    return new Error(`Couldn't get data`, 404);
  }

  res
    .set(customHeader())
    .status(200)
    .json(response.map((c) => convertKeysToCamelCase(c)));
};

const getRoyaltyHistory = async (req, res) => {
  let collectionId = req.params.collectionId;
  if (!checkCollection(collectionId))
    return res.status(400).json('invalid collectionId!');

  let lb, ub;
  // artblocks
  if (collectionId.includes(':')) {
    [collectionId, lb, ub] = collectionId.split(':');
  }

  const query = minify(`
SELECT
    EXTRACT(EPOCH FROM DATE(block_time)) AS day,
    SUM(
      CASE
        WHEN topic_0 = '\\xc4109843e0b7d514e4c093114b863f8e7d8d9a458c372cd51bfe526b588006c9' THEN
          usd_sale_price * royalty_fee_pct / 100
        ELSE
          royalty_fee_usd
      END
    ) AS usd
FROM
    ethereum.nft_trades AS t
JOIN
    ethereum.nft_collections c ON t.collection = c.collection
WHERE
    t.collection = $<collectionId>
GROUP BY
    DATE(block_time)
ORDER BY
    DATE(block_time) ASC;
  `);

  const response = await indexa.query(query, {
    collectionId: `\\${collectionId.slice(1)}`,
  });

  if (!response) {
    return new Error(`Couldn't get data`, 404);
  }

  res
    .set(customHeader())
    .status(200)
    .json(response.map((c) => [c.day, c.usd]));
};

module.exports = {
  getSales,
  getStats,
  getVolume,
  getExchangeStats,
  getExchangeVolume,
  getExchangeVolumeView,
  getRoyalties,
  getRoyaltyHistory,
  getRoyalty,
};
