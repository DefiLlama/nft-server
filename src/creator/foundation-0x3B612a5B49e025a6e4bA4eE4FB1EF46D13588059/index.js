const abi = require('./abi.json');
const config = require('./config.json');

const parse = (decodedData) => {
  const { collectionContract, creator } = decodedData;

  return {
    collection: collectionContract,
    tokenId: null,
    creator,
  };
};

module.exports = { abi, config, parse };
