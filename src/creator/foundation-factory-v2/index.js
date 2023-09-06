const abi = require('./abi.json');
const config = require('./config.json');

const parse = (decodedData) => {
  const { collection, creator } = decodedData;

  return {
    collection,
    tokenId: null,
    creator,
  };
};

module.exports = { abi, config, parse };
