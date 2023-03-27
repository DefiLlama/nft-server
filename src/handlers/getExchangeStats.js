const { getExchangeStats } = require('../controllers/nftTrades');

module.exports.handler = async (event, context) => {
  context.callbackWaitsForEmptyEventLoop = false;
  return await getExchangeStats();
};
