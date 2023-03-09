try {
  require('dotenv').config({ path: './config.env' });
} catch (e) {}

module.exports = {
  DATABASE_URL: process.env.DATABASE_URL,
};
