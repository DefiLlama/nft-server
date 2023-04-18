const minify = require('pg-minify');

const checkCollection = require('../../utils/checkAddress');
const customHeader = require('../../utils/customHeader');
const { convertKeysToCamelCase } = require('../../utils/keyConversion');
const { nft } = require('../../utils/dbConnection');

const getCollection = async (req, res) => {
  const collectionId = req.params.collectionId;
  if (!checkCollection(collectionId))
    return res.status(400).json('invalid collectionId!');

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

  const response = await nft.query(query, {
    collectionId,
  });

  if (!response) {
    return new Error(`Couldn't get data`, 404);
  }

  res
    .set(customHeader())
    .status(200)
    .json(response.map((c) => convertKeysToCamelCase(c)));
};

const getCollectionsQuery = minify(
  `
WITH latest AS (
    SELECT
        DISTINCT ON (collection_id) *
    FROM
        floor
    WHERE
        timestamp >= CURRENT_DATE
        AND floor_price IS NOT NULL
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

// get most recent data for all collections
const getCollections = async (req, res) => {
  // latest = timestamp DESC
  // yesterday and week = timestamp ASC -> first value the oldest one (closest to the required offset)
  const response = await nft.query(getCollectionsQuery);

  if (!response) {
    return new Error(`Couldn't get data`, 404);
  }

  res
    .set(customHeader())
    .status(200)
    .json(response.map((c) => convertKeysToCamelCase(c)));
};

const getFloorHistory = async (req, res) => {
  const collectionId = req.params.collectionId;
  if (!checkCollection(collectionId))
    return res.status(400).json('invalid collectionId!');

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

  const response = await nft.query(query, {
    collectionId,
  });

  if (!response) {
    return new Error(`Couldn't get data`, 404);
  }

  res
    .set(customHeader())
    .status(200)
    .json(response.map((c) => convertKeysToCamelCase(c)));
};

module.exports = {
  getCollection,
  getCollections,
  getFloorHistory,
  getCollectionsQuery,
};
