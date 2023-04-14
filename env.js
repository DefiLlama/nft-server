try {
  require('dotenv').config({ path: './config.env' });
} catch (e) {}

module.exports = {
  DATABASE_URL_NFT: process.env.DATABASE_URL_NFT,
  DATABASE_URL_INDEXA: process.env.DATABASE_URL_INDEXA,
  RESERVOIR_API: process.env.RESERVOIR_API,
  NFT_TRADES_WEBHOOK: process.env.NFT_TRADES_WEBHOOK,
};
