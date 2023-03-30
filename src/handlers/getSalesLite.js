const { getSalesLite } = require('../controllers/nftTrades');

module.exports.handler = async (event, context) => {
  context.callbackWaitsForEmptyEventLoop = false;
  const collectionId = event.pathParameters.collectionId;
  return await getSalesLite(collectionId);
};
