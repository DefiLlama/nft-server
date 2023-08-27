const abi = require('./abi.json');
const config = require('./config.json');
const { nullAddress } = require('../../utils/params');

const collection = '0xABB3738f04Dc2Ec20f4AE4462c3d069d02AE045B';

const parse = (decodedData, event) => {
  const eventType = config.events.find(
    (e) => e.signatureHash === `0x${event.topic_0}`
  )?.name;

  if (eventType === 'BidPlacedOnReserveAuction') {
    const { _id, _currentOwner, _bidder, _amount } = decodedData;

    const price = _amount.toString() / 1e18;

    return {
      collection,
      tokenId: _id,
      price,
      ethPrice: price,
      usdPrice: price * event.price,
      currencyAddress: nullAddress,
      userAddress: _bidder,
      eventType,
    };
  } else if (eventType === 'BuyNowPriceChanged') {
    const { _id, _price } = decodedData;

    const price = _price.toString() / 1e18;

    return {
      collection,
      tokenId: _id,
      price,
      ethPrice: price,
      usdPrice: price * event.price,
      currencyAddress: nullAddress,
      eventType,
    };
  } else if (eventType === 'ListedForBuyNow') {
    const { _id, _price, _currentOwner, _startDate } = decodedData;

    const price = _price.toString() / 1e18;

    return {
      collection,
      tokenId: _id,
      price,
      ethPrice: price,
      usdPrice: price * event.price,
      currencyAddress: nullAddress,
      userAddress: _currentOwner,
      eventType,
    };
  } else if (eventType === 'ListedForReserveAuction') {
    const { _id, _reservePrice, _startDate } = decodedData;

    const price = _reservePrice.toString() / 1e18;

    return {
      collection,
      tokenId: _id,
      price,
      ethPrice: price,
      usdPrice: price * event.price,
      currencyAddress: nullAddress,
      eventType,
    };
  } else if (eventType === 'ReservePriceUpdated') {
    const { _id, _reservePrice } = decodedData;

    const price = _reservePrice.toString() / 1e18;

    return {
      collection,
      tokenId: _id,
      price,
      ethPrice: price,
      usdPrice: price * event.price,
      currencyAddress: nullAddress,
      eventType,
    };
  } else if (eventType === 'TokenBidPlaced') {
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
  } else if (eventType === 'TokenBidWithdrawn') {
    const { _tokenId, _bidder } = decodedData;

    return {
      collection,
      tokenId: _tokenId,
      userAddress: _bidder,
      eventType,
    };
  } else if (eventType === 'TokenDeListed') {
    const { _tokenId } = decodedData;

    return {
      collection,
      tokenId: _tokenId,
      eventType,
    };
  }
};

module.exports = { abi, config, parse };
