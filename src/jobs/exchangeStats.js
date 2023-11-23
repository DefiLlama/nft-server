const { indexa } = require('../utils/dbConnection');

const job = async () => {
  const query = `REFRESH MATERIALIZED VIEW ethereum.nft_trades_exchange_stats;`;

  const response = await indexa.result(query);

  if (!response) {
    return new Error(`Couldn't refersh m-view`, 404);
  }

  console.log(response);
};

module.exports = job;
