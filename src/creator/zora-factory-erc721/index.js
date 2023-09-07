const abi = require('./abi.json');
const config = require('./config.json');

const parse = (decodedData) => {
  const { creator, editionContractAddress } = decodedData;

  return {
    collection: editionContractAddress,
    tokenId: null,
    creator,
  };
};

module.exports = { abi, config, parse };
