const { nft } = require('../utils/dbConnection');

const job = async () => {
  const query = `
    DELETE FROM
        orderbook
    WHERE
        timestamp < NOW() - INTERVAL '1 DAY'
    `;

  const response = await nft.result(query);

  if (!response) {
    return new Error(`Couldn't delete data`, 404);
  }

  console.log(response);
};

module.exports = job;
