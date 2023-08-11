const abi = require('../../adapters/knownorigin/abi.json');
const config = require('./config.json');

const nullAddress = '0000000000000000000000000000000000000000';

const parse = (decodedData, event) => {
  const eventType = config.events.find(
    (e) => e.signatureHash === `0x${event.topic_0}`
  )?.name;

  if (eventType === 'BidPlacedOnReserveAuction') {
    const { _id, _bidder, _amount, _currentBiddingEnd } = decodedData;

    const price = _amount.toString() / 1e18;

    return {
      eventId: _id,
      price,
      ethPrice: price,
      usdPrice: price * event.price,
      userAddress: _bidder,
      expiration: _currentBiddingEnd,
      currencyAddress: nullAddress,
      eventType,
    };
  } else if (eventType === 'BidWithdrawnFromReserveAuction') {
    const { _id, _bidder } = decodedData;

    return {
      eventId: _id,
      userAddress: _bidder,
      eventType,
    };
  } else if (eventType === 'BuyNowPriceChanged') {
    const { _id, _price } = decodedData;

    const price = _price.toString() / 1e18;

    return {
      eventId: _id,
      price,
      ethPrice: price,
      usdPrice: price * event.price,
      currencyAddress: nullAddress,
      eventType,
    };
  } else if (eventType === 'ConvertFromBuyNowToOffers') {
    const { _editionId } = decodedData;

    return {
      eventId: _editionId,
      eventType,
    };
  } else if (eventType === 'ConvertSteppedAuctionToBuyNow') {
    const { _editionId, _listingPrice } = decodedData;

    const price = _listingPrice.toString() / 1e18;

    return {
      eventId: _editionId,
      price,
      ethPrice: price,
      usdPrice: price * event.price,
      currencyAddress: nullAddress,
      eventType,
    };
  } else if (eventType === 'ListedForBuyNow') {
    const { _id, _price, _currentOwner } = decodedData;

    const price = _price.toString() / 1e18;

    return {
      eventId: _id,
      price,
      ethPrice: price,
      usdPrice: price * event.price,
      currencyAddress: nullAddress,
      eventType,
    };
  } else if (eventType === 'ListedForReserveAuction') {
    const { _id, _reservePrice, _startDate } = decodedData;

    const price = _reservePrice.toString() / 1e18;

    return {
      eventId: _id,
      price,
      ethPrice: price,
      usdPrice: price * event.price,
      currencyAddress: nullAddress,
      eventType,
    };
  } else if (eventType === 'ReserveAuctionConvertedToBuyItNow') {
    const { _id, _listingPrice, _startDate } = decodedData;

    const price = _listingPrice.toString() / 1e18;

    return {
      eventId: _id,
      price,
      ethPrice: price,
      usdPrice: price * event.price,
      currencyAddress: nullAddress,
      eventType,
    };
  } else if (eventType === 'ReserveAuctionConvertedToOffers') {
    const { _editionId, _startDate } = decodedData;

    return {
      eventId: _editionId,
      eventType,
    };
  } else if (eventType === 'ReservePriceUpdated') {
    const { _id, _finalPrice, _currentOwner, _winner, _resulter } = decodedData;

    const price = _finalPrice.toString() / 1e18;

    return {
      eventId: _id,
      eventType,
      price,
      ethPrice: price,
      usdPrice: price * event.price,
      currencyAddress: nullAddress,
      userAddress: _winner,
    };
  } else if (eventType === 'ReservePriceUpdated') {
    const { _id, _reservePrice } = decodedData;

    const price = _reservePrice.toString() / 1e18;

    return {
      eventId: _id,
      eventType,
      price,
      ethPrice: price,
      usdPrice: price * event.price,
      currencyAddress: nullAddress,
    };
  }
};
module.exports = { abi, config, parse };
