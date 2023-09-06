const abi = require('./abi.json');
const config = require('./config.json');

const parse = (decodedData, event) => {
  const { id, owner } = decodedData;

  return {
    collection: event.contract_address,
    tokenId: id,
    creator: owner,
  };
};

module.exports = { abi, config, parse };
