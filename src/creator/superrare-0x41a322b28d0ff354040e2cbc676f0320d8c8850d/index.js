const abi = require('./abi.json');
const config = require('./config.json');

const parse = (decodedData, event) => {
  const { _to, _tokenId } = decodedData;

  return {
    collection: event.contract_address,
    tokenId: _tokenId,
    creator: _to,
  };
};

module.exports = { abi, config, parse };
