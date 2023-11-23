const minify = require('pg-minify');

const { checkCollection } = require('../../utils/checkAddress');
const { customHeader } = require('../../utils/customHeader');
const { convertKeysToCamelCase } = require('../../utils/keyConversion');
const { nft } = require('../../utils/dbConnection');

const getCollection = async (req, res) => {
  const collectionId = req.params.collectionId;
  const ids = collectionId.split(',');
  if (ids.map((id) => checkCollection(id)).includes(false))
    return res.status(400).json('invalid collectionId!');

  const query = minify(
    `
  SELECT
      name,
      symbol,
      image,
      total_supply,
      token_standard,
      project_url,
      twitter_username
  FROM
      collection
  WHERE
      collection_id IN ($<collectionId:csv>)
      `
  );

  const response = await nft.query(query, {
    collectionId: ids,
  });

  if (!response) {
    return new Error(`Couldn't get data`, 404);
  }

  res
    .set(customHeader())
    .status(200)
    .json(response.map((c) => convertKeysToCamelCase(c)));
};

// get most recent data for all collections
const getCollections = async (req, res) => {
  const query = minify(
    `
  SELECT
      *
  FROM
      mv_collections_floor_price
      `
  );

  // latest = timestamp DESC
  // yesterday and week = timestamp ASC -> first value the oldest one (closest to the required offset)
  const response = await nft.query(query);

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
};
