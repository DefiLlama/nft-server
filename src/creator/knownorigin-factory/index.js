const abi = require('./abi.json');
const config = require('./config.json');

const parse = (decodedData) => {
  const { artist, selfSovereignNFT } = decodedData;

  return {
    collection: selfSovereignNFT,
    tokenId: null,
    creator: artist,
  };
};

module.exports = { abi, config, parse };
