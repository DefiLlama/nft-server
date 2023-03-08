const { connect } = require('../utils/dbConnection');

// multi row insert (update on conflict) query generator
const buildConfigQ = (payload) => {
  const columns = [
    'collection',
    'name',
    'slug',
    'image',
    'description',
    'totalSupply',
    'tokenStandard',
  ];
  const cs = new pgp.helpers.ColumnSet(columns, { table: 'config' });
  const query =
    pgp.helpers.insert(payload, cs) +
    ' ON CONFLICT(config_id) DO UPDATE SET ' +
    cs.assignColumns({ from: 'EXCLUDED', skip: 'config_id' });

  return query;
};

// multi row insert query generator
const buildFloorQ = (payload) => {
  const columns = [
    'timestamp',
    'collection',
    'onSaleCount',
    'floorPrice',
    'floorPrice1d',
    'floorPrice7d',
    'floorPrice30d',
    'ownerCount',
  ];
  const cs = new pgp.helpers.ColumnSet(columns, { table: 'floor' });
  return pgp.helpers.insert(payload, cs);
};

// --------- transaction query
const insert = async (payload) => {
  const conn = await connect();

  // build queries
  const configQ = buildConfigQ(payload);
  const floorQ = buildFloorQ(payload);

  return conn
    .tx(async (t) => {
      // sequence of queries:
      // 1. config: insert/update
      const q1 = await t.result(configQ);
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
      return new Error('ConfigFloor Transaction failed, rolling back', 404);
    });
};

module.exports = insert;
