const { getFloorHistory } = require('../controllers/collections');
const checkCollection = require('../utils/checkAddress');

module.exports.handler = async (event, context) => {
  context.callbackWaitsForEmptyEventLoop = false;
  const collectionId = event.pathParameters.collectionId;
  if (!checkCollection(collectionId)) return { status: 'invalid collectionId' };
  return await getFloorHistory(collectionId);
};
