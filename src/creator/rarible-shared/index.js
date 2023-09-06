const abi = require('./abi.json');
const config = require('./config.json');

const parse = (decodedData, event) => {
  const { _to, _id } = decodedData;

  return {
    collection: event.contract_address,
    tokenId: _id,
    creator: _to,
  };
};

module.exports = { abi, config, parse };
