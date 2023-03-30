const _ = require('lodash');
const minify = require('pg-minify');

const { convertKeysToCamelCase } = require('../utils/keyConversion');
const { pgp, connect } = require('../utils/dbConnection');

const db = 'nft';

// multi row insert (update on conflict) query generator
const buildCollectionQ = (payload) => {
  const columns = [
    'collectionId',
    'name',
    'slug',
    'image',
    'tokenStandard',
    'totalSupply',
    'projectUrl',
    'twitterUsername',
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
    'rank',
  ].map((c) => _.snakeCase(c));

  const cs = new pgp.helpers.ColumnSet(columns, { table: 'floor' });
  return pgp.helpers.insert(payload, cs);
};

// --------- transaction query
const insertCollections = async (payload) => {
  const conn = await connect(db);

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

const getCollection = async (collectionId) => {
  const conn = await connect(db);

  const query = minify(
    `
SELECT
    name,
    image,
    total_supply,
    token_standard,
    project_url,
    twitter_username
FROM
    collection
WHERE
    collection_id = $<collectionId>
    `
  );

  const response = await conn.query(query, {
    collectionId,
  });

  if (!response) {
    return new Error(`Couldn't get data`, 404);
  }

  return response.map((c) => convertKeysToCamelCase(c));
};

// get most recent data for all collections
const getCollections = async () => {
  const conn = await connect(db);

  const query = minify(
    `
WITH NOW AS (
    SELECT
        DISTINCT ON (collection_id) *
    FROM
        floor
    WHERE
        timestamp >= DATE_TRUNC('day', NOW() - INTERVAL '1 day')
    ORDER BY
        collection_id,
        timestamp DESC
),
yesterday AS (
    SELECT
        DISTINCT ON (collection_id) *
    FROM
        floor
    WHERE
        timestamp >= DATE_TRUNC('day', NOW() - INTERVAL '1 day')
        AND timestamp < DATE_TRUNC('day', NOW())
    ORDER BY
        collection_id,
        timestamp DESC
),
week AS (
    SELECT
        DISTINCT ON (collection_id) *
    FROM
        floor
    WHERE
        timestamp >= DATE_TRUNC('day', NOW() - INTERVAL '7 day')
        AND timestamp < DATE_TRUNC('day', NOW() - INTERVAL '6 day')
    ORDER BY
        collection_id,
        timestamp DESC
)
SELECT
    NOW.collection_id,
    NOW.timestamp AS timestamp,
    NOW.rank,
    NOW.on_sale_count,
    NOW.floor_price,
    yesterday.floor_price AS floor_price_1_day,
    week.floor_price AS floor_price_7_day,
    calculate_percent_change(NOW.floor_price, yesterday.floor_price) AS floor_price_pct_change_1_day,
    calculate_percent_change(NOW.floor_price, week.floor_price) AS floor_price_pct_change_7_day,
    c.name,
    c.slug,
    c.image,
    c.token_standard,
    c.total_supply,
    c.project_url,
    c.twitter_username
FROM
    NOW
    JOIN yesterday ON NOW.collection_id = yesterday.collection_id
    JOIN week ON NOW.collection_id = week.collection_id
    JOIN collection AS c ON c.collection_id = NOW.collection_id;
  `,
    { compress: true }
  );

  const response = await conn.query(query);

  if (!response) {
    return new Error(`Couldn't get data`, 404);
  }

  return response
    .map((c) => convertKeysToCamelCase(c))
    .filter((c) => c.rank > 0 || c.rank === null)
    .sort((a, b) => (a.rank ?? Infinity) - (b.rank ?? Infinity));
};

const getFloorHistory = async (collectionId) => {
  const conn = await connect(db);

  const query = minify(
    `
SELECT
    timestamp,
    floor_price
FROM
    floor
WHERE
    timestamp IN (
        SELECT
            max(timestamp)
        FROM
            floor
        WHERE
            collection_id = $<collectionId>
        GROUP BY
            (timestamp :: date)
    )
    AND collection_id = $<collectionId>
ORDER BY
    timestamp ASC
  `,
    { compress: true }
  );

  const response = await conn.query(query, {
    collectionId,
  });

  if (!response) {
    return new Error(`Couldn't get data`, 404);
  }

  return response.map((c) => convertKeysToCamelCase(c));
};

module.exports = {
  insertCollections,
  getCollections,
  getCollection,
  getFloorHistory,
};
