const abi = require('./abi.json');
const config = require('./config.json');

const parse = (decodedData, event) => {
  const { _from, _id } = decodedData;

  // note: to prevent insertions of "dupes" will need to run a query prior insert to remove anything which is
  // already in the db
  return {
    collection: event.contract_address,
    tokenId: _id,
    creator: _from,
  };
};

module.exports = { abi, config, parse };
