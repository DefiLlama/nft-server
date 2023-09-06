const abi = require('./abi.json');
const config = require('./config.json');

const parse = (decodedData) => {
  const { newContract, creator } = decodedData;

  return {
    collection: newContract,
    tokenId: null,
    creator,
  };
};

module.exports = { abi, config, parse };
