const _ = require('lodash');
const minify = require('pg-minify');

const { convertKeysToCamelCase } = require('../utils/keyConversion');
const { pgp, connect } = require('../utils/dbConnection');

const dbIndexa = 'indexa';
const dbNft = 'nft';

// multi row insert (update on conflict) query generator
const buildCollectionQ = (payload) => {
  const columns = [
    'collectionId',
    'name',
    'slug',
    'image',
    'tokenStandard',
    'totalSupply',
  ].map((c) => _.snakeCase(c));

  const cs = new pgp.helpers.ColumnSet(columns, { table: 'collection' });
  const query =
    pgp.helpers.insert(payload, cs) +
    ' ON CONFLICT(collection_id) DO UPDATE SET ' +
    cs.assignColumns({ from: 'EXCLUDED', skip: 'collection_id' });

  return query;
};

// multi row insert query generator
const buildFloorQ = (payload) => {
  const columns = [
    'collectionId',
    'timestamp',
    'onSaleCount',
    'floorPrice',
    'floorPrice1day',
    'floorPrice7day',
    'floorPrice30day',
  ].map((c) => _.snakeCase(c));

  const cs = new pgp.helpers.ColumnSet(columns, { table: 'floor' });
  return pgp.helpers.insert(payload, cs);
};

// --------- transaction query
const insertCollections = async (payload) => {
  const conn = await connect(dbNft);

  // build queries
  const collectionQ = buildCollectionQ(payload);
  const floorQ = buildFloorQ(payload);

  return conn
    .tx(async (t) => {
      // sequence of queries:
      // 1. config: insert/update
      const q1 = await t.result(collectionQ);
      // 2. floor: insert
      const q2 = await t.result(floorQ);

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

// get most recent data for all collections
const getCollections = async () => {
  const conn = await connect(dbNft);

  const query = minify(
    `
WITH filtered_records AS (
    SELECT
        DISTINCT ON (collection_id) *
    FROM
        floor
    WHERE
        timestamp >= NOW() - INTERVAL '7 DAY'
    ORDER BY
        collection_id,
        timestamp DESC
)
SELECT
    f.collection_id,
    timestamp,
    name,
    slug,
    image,
    token_standard,
    total_supply,
    on_sale_count,
    floor_price,
    floor_price_1_day,
    floor_price_7_day,
    floor_price_30_day,
    calculate_percent_change(floor_price, floor_price_1_day) as floor_price_pct_change_1_day,
    calculate_percent_change(floor_price, floor_price_7_day) as floor_price_pct_change_7_day,
    calculate_percent_change(floor_price, floor_price_30_day) as floor_price_pct_change_30_day
FROM
    filtered_records AS f
    INNER JOIN collection AS c ON c.collection_id = f.collection_id;
  `,
    { compress: true }
  );

  const response = await conn.query(query);

  if (!response) {
    return new Error(`Couldn't get data`, 404);
  }

  return response.map((c) => convertKeysToCamelCase(c));
};

// get all sales for a given collectionId
const getCollectionSales = async (collectionId) => {
  const conn = await connect(dbIndexa);

  const query = minify(`
SELECT
    encode(transaction_hash, 'hex') AS transaction_hash,
    block_time,
    block_number,
    encode(exchange_name, 'escape') AS exchange_name,
    encode(token_id, 'hex') AS token_id,
    sale_price,
    eth_sale_price,
    usd_sale_price,
    encode(seller, 'hex') AS seller,
    encode(buyer, 'hex') AS buyer
FROM
    ethereum.nft_trades
WHERE
    collection = $<collectionId>
  `);

  const response = await conn.query(query, {
    collectionId: `\\${collectionId.slice(1)}`,
  });

  if (!response) {
    return new Error(`Couldn't get data`, 404);
  }

  return response.map((c) => convertKeysToCamelCase(c));
};

// get daily aggregated statistics such as volume, sale count per day for a given collectionId
const getCollectionStats = async (collectionId) => {
  const conn = await connect(dbIndexa);

  const query = minify(`
SELECT
    block_time :: date AS day,
    sum(eth_sale_price),
    count(eth_sale_price)
FROM
    ethereum.nft_trades
WHERE
    collection = $<collectionId>
GROUP BY
    (block_time :: date)
  `);

  const response = await conn.query(query, {
    collectionId: `\\${collectionId.slice(1)}`,
  });

  if (!response) {
    return new Error(`Couldn't get data`, 404);
  }

  return response.map((c) => convertKeysToCamelCase(c));
};

// get 1day,7day,30day volumes per collection
const getVolumeStats = async () => {
  const conn = await connect(dbIndexa);

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

  return response.map((c) => convertKeysToCamelCase(c));
};

module.exports = {
  insertCollections,
  getCollections,
  getCollectionSales,
  getCollectionStats,
  getVolumeStats,
};
