const abi = require('./abi.json');
const config = require('./config.json');

const parse = (decodedData, event) => {
  const {
    listing: { listingAssets: tokens },
  } = decodedData;

  const collection = tokens[0][0];
  const tokenId = tokens[1][0];
  console.log(collection, tokenId);
};

module.exports = { abi, config, parse };
