const { getMarketplaceIcons } = require('../controllers/collections');

module.exports.handler = async (event, context) => {
  context.callbackWaitsForEmptyEventLoop = false;
  return await getMarketplaceIcons();
};
