const abi = require('./abi.json');
const config = require('./config.json');

const parse = (data, topics, interface, eventName, event) => {
  const { newLeftFill } = interface.decodeEventLog(eventName, data, topics);

  const ethSalePrice = newLeftFill.toString() / 1e18;

  // note:missing collection, tokenId, seller and maker from event...
  // need to read method args

  return {
    collection: 'test',
    tokenId: 'test',
    amount: 1,
    ethSalePrice,
    usdSalePrice: ethSalePrice * event.price,
    paymentToken: '0x0000000000000000000000000000000000000000',
    seller: 'test',
    buyer: 'test',
  };
};

module.exports = { abi, config, parse };
