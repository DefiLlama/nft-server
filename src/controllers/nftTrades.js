const { pgp, connect } = require('../utils/dbConnection');

const columns = [
  'transaction_hash',
  'log_index',
  'contract_address',
  'topic_0',
  'block_time',
  'block_number',
  'exchange_name',
  'collection',
  'token_id',
  'amount',
  'eth_sale_price',
  'usd_sale_price',
  'payment_token',
  'seller',
  'buyer',
];

const tableName = 'nft_trades';

const insertTrades = async (payload) => {
  const conn = await connect('nft');

  const cs = new pgp.helpers.ColumnSet(columns, { table: tableName });
  const query = pgp.helpers.insert(payload, cs);

  const response = await conn.result(query);

  if (!response) {
    return new Error(`Couldn't insert into ${tableName}`, 404);
  }

  return response;
};

module.exports = insertTrades;
