const abi = require('../../adapters/foundation/abi.json');
const config = require('./config.json');

const parse = (decodedData, event) => {
  const { nftContract, tokenId, seller, price: _price } = decodedData;

  const price = _price.toString() / 1e18;

  const collection = nftContract;
  const address = seller;
  const activity = config.events.find(
    (e) => e.signatureHash === `0x${event.topic_0}`
  )?.name;

  return {
    collection,
    tokenId,
    price,
    ethPrice: price,
    usdPrice: price * event.price,
    address,
    activity,
  };
};

module.exports = { abi, config, parse };
