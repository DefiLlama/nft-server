const _ = require('lodash');
const minify = require('pg-minify');

const { convertKeysToCamelCase } = require('../utils/keyConversion');
const { pgp, connect } = require('../utils/dbConnection');
const lambdaResponse = require('../utils/lambda');

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

  return lambdaResponse(response.map((c) => convertKeysToCamelCase(c)));
};

// get most recent data for all collections
const getCollections = async () => {
  const conn = await connect(db);

  // latest = timestamp DESC
  // yesterday and week = timestamp ASC -> first value the oldest one (closest to the required offset)
  const query = minify(
    `
WITH latest AS (
    SELECT
        DISTINCT ON (collection_id) *
    FROM
        floor
    WHERE
        timestamp >= CURRENT_DATE
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
        timestamp >= NOW() - INTERVAL '1 day'
        AND timestamp < CURRENT_DATE
    ORDER BY
        collection_id,
        timestamp ASC
),
week AS (
    SELECT
        DISTINCT ON (collection_id) *
    FROM
        floor
    WHERE
        timestamp >= NOW() - INTERVAL '7 day'
        AND timestamp < DATE_TRUNC('day', NOW() - INTERVAL '6 day')
    ORDER BY
        collection_id,
        timestamp ASC
)
SELECT
    latest.collection_id,
    c.name,
    c.image,
    c.total_supply,
    latest.on_sale_count,
    latest.floor_price,
    calculate_percent_change(latest.floor_price, yesterday.floor_price) AS floor_price_pct_change_1_day,
    calculate_percent_change(latest.floor_price, week.floor_price) AS floor_price_pct_change_7_day
FROM
    latest
    LEFT JOIN yesterday ON latest.collection_id = yesterday.collection_id
    LEFT JOIN week ON latest.collection_id = week.collection_id
    LEFT JOIN collection AS c ON c.collection_id = latest.collection_id
WHERE latest.rank > 0 OR latest.rank IS NULL
ORDER BY COALESCE(latest.rank, CAST('Infinity' AS NUMERIC));
  `,
    { compress: true }
  );

  const response = await conn.query(query);

  if (!response) {
    return new Error(`Couldn't get data`, 404);
  }

  return response.map((c) => convertKeysToCamelCase(c));
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
