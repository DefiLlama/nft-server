const abi = require('./abi.json');
const config = require('./config.json');

const parse = (decodedData, event) => {
  const { proxy } = decodedData;

  return {
    collection: proxy,
    tokenId: null,
    creator: event.from_address,
  };
};

module.exports = { abi, config, parse };
