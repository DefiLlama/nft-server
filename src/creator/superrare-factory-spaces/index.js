const abi = require('./abi.json');
const config = require('./config.json');

const parse = (decodedData) => {
  const { _contractAddress } = decodedData;

  return {
    collection: _contractAddress,
    tokenId: null,
    creator: null,
  };
};

module.exports = { abi, config, parse };
