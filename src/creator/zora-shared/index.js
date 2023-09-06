const abi = require('./abi.json');
const config = require('./config.json');

const parse = (decodedData, event) => {
  const { to, tokenId } = decodedData;

  return {
    collection: event.contract_address,
    tokenId,
    creator: to,
  };
};

module.exports = { abi, config, parse };
