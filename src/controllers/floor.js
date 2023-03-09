const _ = require('lodash');

const { pgp, connect } = require('../utils/dbConnection');

// multi row insert (update on conflict) query generator
const buildCollectionQ = (payload) => {
  const columns = [
    'collectionID',
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
    'collectionID',
    'timestamp',
    'onSaleCount',
    'floorPrice',
    'floorPrice1day',
    'floorPrice7day',
    'floorPrice30day',
    'ownerCount',
  ].map((c) => _.snakeCase(c));

  const cs = new pgp.helpers.ColumnSet(columns, { table: 'floor' });
  return pgp.helpers.insert(payload, cs);
};

// --------- transaction query
const insert = async (payload) => {
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

module.exports = insert;
