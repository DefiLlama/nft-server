const pgp = require('pg-promise')({
  capSQL: true,
});
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../../config.env') });

pgp.pg.types.setTypeParser(20, parseInt);
pgp.pg.types.setTypeParser(1700, parseFloat);

const indexa = pgp({
  connectionString: process.env.DATABASE_URL_INDEXA,
  max: 50,
  idleTimeoutMillis: 30000,
});

const nft = pgp({
  connectionString: process.env.DATABASE_URL_NFT,
  max: 10,
  idleTimeoutMillis: 30000,
});

module.exports = { pgp, indexa, nft };
