const minify = require('pg-minify');

const { connect } = require('../utils/dbConnection');

const getMaxBlock = async (db, table) => {
  // the db variable is temporary, can be hardcoded to 'indexa' after tests
  const conn = await connect(db);

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
