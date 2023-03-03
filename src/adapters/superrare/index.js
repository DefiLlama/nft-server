const abi = require('./abi.json');
const config = require('./config.json');

const parse = (data, topics, interface, eventName, event) => {
  const {
    _originContract,
    _buyer,
    _seller,
    _currencyAddress,
    _amount,
    _tokenId,
    _bidder,
  } = interface.decodeEventLog(eventName, data, topics);

  const ethSalePrice = _amount.toString() / 1e18;

  return {
    collection: _originContract,
    tokenId: _tokenId,
    amount: 1,
    ethSalePrice,
    usdSalePrice: ethSalePrice * event.price,
    paymentToken: _currencyAddress,
    seller: _seller,
    buyer: _buyer ?? _bidder,
  };
};

module.exports = { abi, config, parse };
