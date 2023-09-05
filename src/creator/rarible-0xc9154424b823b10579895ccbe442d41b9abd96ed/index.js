const abi = require('./abi.json');
const config = require('./config.json');

const collection = '0xc9154424b823b10579895ccbe442d41b9abd96ed';

const parse = (decodedData) => {
  const {
    tokenId,
    creators: [{ account }],
  } = decodedData;

  return {
    collection,
    tokenId,
    creator: account,
  };
};

module.exports = { abi, config, parse };
