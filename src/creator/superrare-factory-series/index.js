const abi = require('./abi.json');
const config = require('./config.json');

const parse = (decodedData) => {
  const { contractAddress, owner } = decodedData;

  return {
    collection: contractAddress,
    tokenId: null,
    creator: owner,
  };
};

module.exports = { abi, config, parse };
