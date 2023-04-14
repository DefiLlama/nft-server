const { pgp, indexa } = require('../src/utils/dbConnection');
const blacklist = require('./blacklist');

const schema = 'ethereum';
const table = 'nft_trades_blacklist';

const insert = async (payload) => {
  const cs = new pgp.helpers.ColumnSet(['transaction_hash'], {
    table: new pgp.helpers.TableName({
      schema,
      table,
    }),
  });

  const query =
    pgp.helpers.insert(payload, cs) +
    ' ON CONFLICT(transaction_hash) DO UPDATE SET transaction_hash = EXCLUDED.transaction_hash';

  const response = await indexa.result(query);

  if (!response) {
    return new Error(`Couldn't insert into ${schema}.${table}`, 404);
  }

  return response;
};

(async () => {
  const payload = blacklist.map((b) => ({
    transaction_hash: Buffer.from(b.replace('0x', ''), 'hex'),
  }));

  const response = await insert(payload);
  console.log(response);
  process.exit();
})();
