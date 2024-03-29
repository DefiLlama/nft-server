const abi = require('./abi.json');
const config = require('./config.json');
const { nullAddress } = require('../../utils/params');
const getEventType = require('../../utils/eventType');

const collection = '0xFBeef911Dc5821886e1dda71586d90eD28174B7d';

const parse = (decodedData, event) => {
  const eventType = getEventType(config, event);

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
  } else if (eventType === 'TokenListed') {
    const { _tokenId, _seller, _price } = decodedData;

    const price = _price.toString() / 1e18;

    return {
      collection,
      tokenId: _tokenId,
      price,
      ethPrice: price,
      usdPrice: price * event.price,
      currencyAddress: nullAddress,
      userAddress: _seller,
      eventType,
    };
  } else if (eventType === 'TokenDeListed') {
    const { _tokenId } = decodedData;

    return {
      collection,
      tokenId: _tokenId,
      eventType,
    };
  } else if (eventType === 'BidPlaced') {
    const { _tokenId, _currentOwner, _bidder, _amount } = decodedData;

    const price = _amount.toString() / 1e18;

    return {
      collection,
      tokenId: _tokenId,
      price,
      ethPrice: price,
      usdPrice: price * event.price,
      currencyAddress: nullAddress,
      userAddress: _bidder,
      eventType,
    };
  } else if (eventType === 'BidWithdrawn') {
    const { _tokenId, _bidder } = decodedData;

    return {
      collection,
      tokenId: _tokenId,
      userAddress: _bidder,
      eventType,
    };
  } else if (eventType === 'BidRejected') {
    const { _tokenId, _currentOwner, _bidder, _amount } = decodedData;

    const price = _amount.toString() / 1e18;

    return {
      collection,
      tokenId: _tokenId,
      userAddress: _currentOwner,
      price,
      ethPrice: price,
      usdPrice: price * event.price,
      currencyAddress: nullAddress,
      eventType,
    };
  }
};

module.exports = { abi, config, parse };
