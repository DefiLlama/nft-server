const { getSales } = require('../controllers/nftTrades');

module.exports.handler = async (event, context) => {
  context.callbackWaitsForEmptyEventLoop = false;
  const collectionId = event.pathParameters.collectionId;
  return await getSales(collectionId);
};
