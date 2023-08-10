const abi = require('../../adapters/knownorigin/abi.json');
const config = require('./config.json');

const parse = (decodedData, event) => {
  const activity = config.events.find(
    (e) => e.signatureHash === `0x${event.topic_0}`
  )?.name;

  if (activity === 'BidPlacedOnReserveAuction') {
    const { _id, _bidder, _amount, _currentBiddingEnd } = decodedData;

    const price = _amount.toString() / 1e18;

    return {
      id: _id,
      price,
      ethPrice: price,
      usdPrice: price * event.price,
      address: _bidder,
      expiration: _currentBiddingEnd,
      activity,
    };
  } else if (activity === 'BidWithdrawnFromReserveAuction') {
    const { _id, _bidder } = decodedData;

    return {
      id: _id,
      address: _bidder,
      activity,
    };
  } else if (activity === 'BuyNowPriceChanged') {
    const { _id, _price } = decodedData;

    const price = _price.toString() / 1e18;

    return {
      id: _id,
      price,
      ethPrice: price,
      usdPrice: price * event.price,
      activity,
    };
  } else if (activity === 'ConvertFromBuyNowToOffers') {
    const { _editionId } = decodedData;

    return {
      id: _editionId,
      activity,
    };
  } else if (activity === 'ConvertSteppedAuctionToBuyNow') {
    const { _editionId, _listingPrice } = decodedData;

    const price = _listingPrice.toString() / 1e18;

    return {
      id: _editionId,
      price,
      ethPrice: price,
      usdPrice: price * event.price,
      activity,
    };
  } else if (['EditionBidPlaced', 'EditionBidRejected'].includes(activity)) {
    const { _editionId, _bidder, _amount } = decodedData;

    const price = _amount.toString() / 1e18;

    return {
      id: _editionId,
      activity,
      price,
      ethPrice: price,
      usdPrice: price * event.price,
      address: _bidder,
    };
  } else if (activity === 'EditionBidWithdrawn') {
    const { _editionId, _bidder } = decodedData;

    return {
      id: _editionId,
      address: _bidder,
      activity,
    };
  } else if (activity === 'EditionConvertedFromOffersToBuyItNow') {
    const { _editionId, _price } = decodedData;

    const price = _price.toString() / 1e18;

    return {
      id: _editionId,
      address: _bidder,
      price,
      ethPrice: price,
      usdPrice: price * event.price,
      activity,
    };
  } else if (activity === 'EditionSteppedAuctionUpdated') {
    const { _editionId, _basePrice } = decodedData;

    const price = _basePrice.toString() / 1e18;

    return {
      id: _editionId,
      price,
      ethPrice: price,
      usdPrice: price * event.price,
      activity,
    };
  } else if (activity === 'EditionSteppedSaleBuy') {
    const { _editionId, _tokenId, _buyer, _price } = decodedData;

    const price = _price.toString() / 1e18;

    return {
      id: _editionId,
      tokenId: _tokenId,
      address: _buyer,
      price,
      ethPrice: price,
      usdPrice: price * event.price,
      activity,
    };
  } else if (activity === 'EditionSteppedSaleListed') {
    const { _editionId, _basePrice, _stepPrice } = decodedData;

    const price = _basePrice.toString() / 1e18;

    return {
      id: _editionId,
      price,
      ethPrice: price,
      usdPrice: price * event.price,
      activity,
    };
  } else if (activity === 'ListedForBuyNow') {
    const { _id, _price, _currentOwner } = decodedData;

    const price = _price.toString() / 1e18;

    return {
      id: _id,
      price,
      ethPrice: price,
      usdPrice: price * event.price,
      activity,
    };
  } else if (activity === 'ListedForReserveAuction') {
    const { _id, _reservePrice, _startDate } = decodedData;

    const price = _reservePrice.toString() / 1e18;

    return {
      id: _id,
      price,
      ethPrice: price,
      usdPrice: price * event.price,
      activity,
    };
  } else if (activity === 'ReserveAuctionConvertedToBuyItNow') {
    const { _id, _listingPrice, _startDate } = decodedData;

    const price = _listingPrice.toString() / 1e18;

    return {
      id: _id,
      price,
      ethPrice: price,
      usdPrice: price * event.price,
      activity,
    };
  } else if (activity === 'ReserveAuctionConvertedToOffers') {
    const { _editionId, _startDate } = decodedData;

    return {
      id: _editionId,
      activity,
    };
  } else if (activity === 'ReservePriceUpdated') {
    const { _id, _finalPrice, _currentOwner, _winner, _resulter } = decodedData;

    const price = _finalPrice.toString() / 1e18;

    return {
      id: _id,
      activity,
      price,
      ethPrice: price,
      usdPrice: price * event.price,
      address: _winner,
    };
  } else if (activity === 'ReservePriceUpdated') {
    const { _id, _reservePrice } = decodedData;

    const price = _reservePrice.toString() / 1e18;

    return {
      id: _id,
      activity,
      price,
      ethPrice: price,
      usdPrice: price * event.price,
    };
  }
};
module.exports = { abi, config, parse };
