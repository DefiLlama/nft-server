const abi = require('./abi.json');
const config = require('./config.json');

const parse = (data, topics, interface, eventName, event) => {
  const {
    taker,
    maker,
    currency,
    collection,
    tokenId,
    amount,
    price: ethPrice,
  } = interface.decodeEventLog(eventName, data, topics);

  const ethSalePrice = ethPrice.toString() / 1e18;

  return {
    collection,
    tokenId,
    amount,
    ethSalePrice,
    usdSalePrice: ethSalePrice * event.price,
    paymentToken: currency,
    seller: maker,
    buyer: taker,
  };
};

module.exports = { abi, config, parse };
