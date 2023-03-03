const abi = require('./abi.json');
const config = require('./config.json');

const parse = (data, topics, interface, eventName, event) => {
  const {
    tokenId,
    bid: { amount, currency, bidder, recipient },
  } = interface.decodeEventLog(eventName, data, topics);

  const ethSalePrice = amount.toString() / 1e18;

  // note: missing events

  return {
    collection: recipient,
    tokenId,
    amount,
    ethSalePrice,
    usdSalePrice: ethSalePrice * event.price,
    paymentToken: currency,
    seller: recipient,
    buyer: bidder,
  };
};

module.exports = { abi, config, parse };
