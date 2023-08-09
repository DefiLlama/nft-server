const abi = require('../../adapters/foundation/abi.json');
const config = require('./config.json');

const parse = (decodedData, event) => {
  const activity = config.events.find(
    (e) => e.signatureHash === `0x${event.topic_0}`
  )?.name;

  if (activity === 'BuyPriceSet') {
    const { nftContract, tokenId, seller, price: _price } = decodedData;

    const price = _price.toString() / 1e18;

    return {
      collection: nftContract,
      tokenId,
      price,
      ethPrice: price,
      usdPrice: price * event.price,
      address: seller,
      activity,
    };
  } else if (
    ['BuyPriceCanceled', 'BuyPriceInvalidated', 'OfferInvalidated'].includes(
      activity
    )
  ) {
    const { nftContract, tokenId } = decodedData;

    return {
      collection: nftContract,
      tokenId,
      activity,
    };
  } else if (activity === 'OfferMade') {
    const { nftContract, tokenId, buyer, amount, expiration } = decodedData;

    const price = amount.toString() / 1e18;

    return {
      collection: nftContract,
      tokenId,
      price,
      ethPrice: price,
      usdPrice: price * event.price,
      address: buyer,
      activity,
      expiration,
    };
  } else if (activity === 'ReserveAuctionBidPlaced') {
    const { auctionId, bidder, amount, endTime } = decodedData;

    const price = amount.toString() / 1e18;

    return {
      auctionId,
      address: bidder,
      price,
      ethPrice: price,
      usdPrice: price * event.price,
      activity,
      expiration: endTime,
    };
  } else if (
    ['ReserveAuctionCanceled', 'ReserveAuctionInvalidated'].includes(activity)
  ) {
    const { auctionId } = decodedData;

    return {
      auctionId,
      activity,
    };
  } else if (activity === 'ReserveAuctionCreated') {
    const { seller, nftContract, tokenId, duration, reservePrice, auctionId } =
      decodedData;

    const price = reservePrice.toString() / 1e18;

    return {
      auctionId,
      address: seller,
      collection: nftContract,
      tokenId,
      price,
      ethPrice: price,
      usdPrice: price * event.price,
      activity,
      duration,
    };
  } else if (activity === 'ReserveAuctionUpdated') {
    const { auctionId, reservePrice } = decodedData;

    const price = reservePrice.toString() / 1e18;

    return {
      auctionId,
      activity,
      price,
      ethPrice: price,
      usdPrice: price * event.price,
    };
  }
};

module.exports = { abi, config, parse };
