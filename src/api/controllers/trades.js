const minify = require('pg-minify');

const { checkCollection, checkNft } = require('../../utils/checkAddress');
const { convertKeysToCamelCase } = require('../../utils/keyConversion');
const {
  customHeader,
  customHeaderFixedCache,
} = require('../../utils/customHeader');
const { indexa } = require('../../utils/dbConnection');

const getSales = async (req, res) => {
  let collectionId = req.query.collectionId;
  if (!collectionId || !checkCollection(collectionId))
    return res.status(400).json('invalid collectionId!');
  let tokenId = req.query.tokenId;

  let lb, ub;
  // artblocks
  if (collectionId.includes(':')) {
    [collectionId, lb, ub] = collectionId.split(':');
  }

  let columns =
    'SELECT EXTRACT(EPOCH FROM block_time) AS block_time, eth_sale_price';
  if (tokenId) {
    columns +=
      ", ENCODE(transaction_hash, 'hex') AS tx_hash, ENCODE(seller, 'hex') AS seller, ENCODE(buyer, 'hex') AS buyer";
  }

  const query = minify(`
    WITH sales AS (
        ${columns}
    FROM
        ethereum.nft_trades AS t
    WHERE
        collection = $<collectionId>
        ${
          lb
            ? "AND encode(token_id, 'escape')::numeric BETWEEN $<lb> AND $<ub>"
            : tokenId
            ? 'AND token_id = $<tokenId>'
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
    tokenId,
  });

  if (!response) {
    return new Error(`Couldn't get data`, 404);
  }

  if (!tokenId) {
    res
      .set(customHeaderFixedCache(300))
      .status(200)
      .json(response.map((c) => [c.block_time, c.eth_sale_price]));
  } else {
    res.set(customHeaderFixedCache(300)).status(200).json(response);
  }
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
    .set(customHeaderFixedCache(300))
    .status(200)
    .json(response.map((c) => convertKeysToCamelCase(c)));
};

// get 1day,7day volumes per collection
const getVolume = async (req, res) => {
  const response = await indexa.query(
    'SELECT * FROM ethereum.nft_trades_collections_volume'
  );

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
  const trades_clean = await indexa.query(
    'SELECT * FROM ethereum.nft_trades_exchange_stats'
  );

  const response = trades_clean.map((m_clean) => ({
    ...m_clean,
    wash_volume7d_pct: null,
    // (1 -
    //   m_clean['7day_volume'] /
    //     trades.find((m) => m.exchange_name === m_clean.exchange_name)?.[
    //       '7day_volume'
    //     ]) *
    // 100,
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
    encode(collection, 'hex') as collection,
    SUM(CASE WHEN block_time >= (NOW() - INTERVAL '1 DAY') THEN royalty_fee_usd END) AS "usd_1d",
    SUM(CASE WHEN block_time >= (NOW() - INTERVAL '7 DAY') THEN royalty_fee_usd END) AS "usd_7d",
    SUM(CASE WHEN block_time >= (NOW() - INTERVAL '30 DAY') THEN royalty_fee_usd END) AS "usd_30d",
    SUM(royalty_fee_usd) AS usd_lifetime
  FROM
    ethereum.nft_trades
  WHERE
    eth_sale_price > royalty_fee_eth
  GROUP BY
    collection
  )
SELECT
  *
FROM
  royalty_stats
WHERE
  usd_lifetime > 0
ORDER BY
  usd_lifetime DESC
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
  SUM(royalty_fee_usd) AS usd_lifetime
FROM
  ethereum.nft_trades
WHERE
  collection = $<collectionId>
  and eth_sale_price > royalty_fee_eth
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
    SUM(royalty_fee_usd) AS usd
FROM
    ethereum.nft_trades
WHERE
    collection = $<collectionId>
    and eth_sale_price > royalty_fee_eth
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

const getLastSalePrice = async (req, res) => {
  const nft = req.params.nft?.split(',');
  if (nft?.map((nft) => checkNft(nft)).includes(false))
    return res.status(400).json('invalid query params!');

  const query = minify(`
SELECT
    encode(collection, 'hex') AS collection,
    encode(token_id, 'escape') AS token_id,
    eth_sale_price
FROM
    ethereum.nft_trades
WHERE
    collection = $<collection>
    AND token_id = $<tokenId>
ORDER BY
    collection,
    token_id,
    block_number DESC,
    log_index DESC
LIMIT
    1
  `);

  const nft_ = nft[0].split(':');

  const response = await indexa.query(query, {
    collection: `\\${nft_[0].slice(1)}`,
    tokenId: nft_[1],
  });

  if (!response) {
    return new Error(`Couldn't get data`, 404);
  }

  res.set(customHeaderFixedCache(300)).status(200).json(response);
};

const getUserSaleHistory = async (req, res) => {
  const user = req.params.user;
  if (!checkCollection(user)) return res.status(400).json('invalid address!');

  const query = `
SELECT
  block_time,
  encode(collection, 'hex') AS collection,
  encode(token_id, 'escape') AS token_id,
  eth_sale_price
FROM
  ethereum.nft_trades
WHERE
  seller = $<user>
ORDER BY
  block_number DESC,
  log_index DESC`;

  const response = await indexa.query(query, {
    user: `\\${user.slice(1)}`,
  });

  if (!response) {
    return new Error(`Couldn't get data`, 404);
  }

  res.set(customHeaderFixedCache(300)).status(200).json(response);
};

module.exports = {
  getSales,
  getStats,
  getVolume,
  getExchangeStats,
  getExchangeVolume,
  getRoyalties,
  getRoyaltyHistory,
  getRoyalty,
  getLastSalePrice,
  getUserSaleHistory,
};
