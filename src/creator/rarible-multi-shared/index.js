const abi = require('./abi.json');
const config = require('./config.json');

const parse = (decodedData, event) => {
  const {
    tokenId,
    creators: [{ account }],
  } = decodedData;

  return {
    collection: event.contract_address,
    tokenId,
    creator: account,
  };
};

module.exports = { abi, config, parse };
