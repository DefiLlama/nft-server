const abi = require('./abi.json');
const config = require('./config.json');

const nullAddress = '0x0000000000000000000000000000000000000000';
const collection = '0xFBeef911Dc5821886e1dda71586d90eD28174B7d';

const parse = (decodedData, event) => {
  const eventType = config.events.find(
    (e) => e.signatureHash === `0x${event.topic_0}`
  )?.name;

  if (eventType === 'TokenPurchased') {
    const { _tokenId, _buyer, _seller, _price } = decodedData;

    const salePrice = _price.toString() / 1e18;

    return {
      collection,
      tokenId: _tokenId,
      amount: 1,
      salePrice,
      ethSalePrice: salePrice,
      usdSalePrice: salePrice * event.price,
      paymentToken: nullAddress,
      seller: _seller,
      buyer: _buyer,
    };
  } else if (eventType === 'BidAccepted') {
    const { _tokenId, _currentOwner, _bidder, _amount } = decodedData;

    const salePrice = _amount.toString() / 1e18;

    return {
      collection,
      tokenId: _tokenId,
      amount: 1,
      salePrice,
      ethSalePrice: salePrice,
      usdSalePrice: salePrice * event.price,
      paymentToken: nullAddress,
      seller: _currentOwner,
      buyer: _bidder,
    };
  }
};

module.exports = { abi, config, parse };
