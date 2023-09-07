const abi = require('./abi.json');
const config = require('./config.json');

const collection = '0x3b3ee1931dc30c1957379fac9aba94d1c48a5405';

const parse = (decodedData) => {
  const { toCreator, tokenId } = decodedData;

  return {
    collection,
    tokenId,
    creator: toCreator,
  };
};

module.exports = { abi, config, parse };
