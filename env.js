try {
  require('dotenv').config({ path: './config.env' });
} catch (e) {}

module.exports = {
  DATABASE_URL_NFT: process.env.DATABASE_URL_NFT,
  RESERVOIR_API: process.env.RESERVOIR_API,
};
