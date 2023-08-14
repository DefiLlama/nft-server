const { pgp, indexa } = require('../src/utils/dbConnection');
const aggregatorData = require('../src/etype/adapters/aggregators');

const schema = 'ethereum';
const table = 'nft_aggregators_appendage';

const insertAggregatorAppendage = async (payload) => {
  const columns = ['name', 'appendage', 'appendage_length'];

  const cs = new pgp.helpers.ColumnSet(columns, {
    table: new pgp.helpers.TableName({
      schema,
      table,
    }),
  });

  const query =
    pgp.helpers.insert(payload, cs) +
    ' ON CONFLICT(appendage) DO UPDATE SET ' +
    cs.assignColumns({ from: 'EXCLUDED', skip: 'appendage' });

  const response = await indexa.result(query);

  if (!response) {
    return new Error(`Couldn't insert into ${schema}.${table}`, 404);
  }

  return response;
};

(async () => {
  const payload = aggregatorData
    .filter((a) => a.appendage)
    .map((a) => ({
      name: a.name,
      appendage: Buffer.from(a.appendage),
      appendage_length: a.appendage.length,
    }));

  const response = await insertAggregatorAppendage(payload);
  console.log(response);
  process.exit();
})();
