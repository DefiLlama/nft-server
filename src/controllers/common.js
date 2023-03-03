const minify = require('pg-minify');

const { connect } = require('../utils/dbConnection');

const getMaxBlock = async (table) => {
  const conn = await connect();

  const query = minify(
    `
SELECT
    MAX(block_number)
FROM
    $<table:raw>
  `,
    { compress: true }
  );

  const response = await conn.query(query, { table });

  if (!response) {
    return new Error('getLastBlock failed', 404);
  }

  return response[0].max;
};

module.exports = getMaxBlock;
