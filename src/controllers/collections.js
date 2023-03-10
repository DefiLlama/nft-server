const _ = require('lodash');
const minify = require('pg-minify');

const { convertKeysToCamelCase } = require('../utils/keyConversion');
const { pgp, connect } = require('../utils/dbConnection');

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
  const conn = await connect();

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

// get most recent collection data
const getCollections = async () => {
  const conn = await connect();

  const query = minify(
    `
WITH filtered_records AS (
    SELECT
        DISTINCT ON (collection_id) *
    FROM
        $<floorTable:name>
    WHERE
        timestamp >= NOW() - INTERVAL '$<age> DAY'
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
    INNER JOIN $<collectionTable:name> AS c ON c.collection_id = f.collection_id;
  `,
    { compress: true }
  );

  const response = await conn.query(query, {
    age: 7,
    floorTable: 'floor',
    collectionTable: 'collection',
  });

  if (!response) {
    return new Error(`Couldn't get collection data`, 404);
  }

  return response.map((c) => convertKeysToCamelCase(c));
};

module.exports = { insertCollections, getCollections };
