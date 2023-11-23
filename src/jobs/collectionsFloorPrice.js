const { nft } = require('../utils/dbConnection');

const job = async () => {
  const query = `REFRESH MATERIALIZED VIEW mv_collections_floor_price;`;

  const response = await nft.result(query);

  if (!response) {
    return new Error(`Couldn't refersh m-view`, 404);
  }

  console.log(response);
};

module.exports = job;
