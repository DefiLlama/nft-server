const abi = require('../../adapters/foundation/abi.json');
const config = require('./config.json');

const nullAddress = '0000000000000000000000000000000000000000';

const parse = (decodedData, event) => {
  const eventType = config.events.find(
    (e) => e.signatureHash === `0x${event.topic_0}`
  )?.name;

  if (eventType === 'BuyPriceSet') {
    const { nftContract, tokenId, seller, price: _price } = decodedData;

    const price = _price.toString() / 1e18;

    return {
      collection: nftContract,
      tokenId,
      price,
      ethPrice: price,
      usdPrice: price * event.price,
      currencyAddress: nullAddress,
      userAddress: seller,
      eventType,
    };
  } else if (
    ['BuyPriceCanceled', 'BuyPriceInvalidated', 'OfferInvalidated'].includes(
      eventType
    )
  ) {
    const { nftContract, tokenId } = decodedData;

    return {
      collection: nftContract,
      tokenId,
      eventType,
    };
  } else if (eventType === 'OfferMade') {
    const { nftContract, tokenId, buyer, amount, expiration } = decodedData;

    const price = amount.toString() / 1e18;

    return {
      collection: nftContract,
      tokenId,
      price,
      ethPrice: price,
      usdPrice: price * event.price,
      currencyAddress: nullAddress,
      userAddress: buyer,
      eventType,
      expiration,
    };
  } else if (eventType === 'ReserveAuctionBidPlaced') {
    const { auctionId, bidder, amount, endTime } = decodedData;

    const price = amount.toString() / 1e18;

    return {
      eventId: auctionId,
      userAddress: bidder,
      price,
      ethPrice: price,
      usdPrice: price * event.price,
      currencyAddress: nullAddress,
      eventType,
      expiration: endTime,
    };
  } else if (
    ['ReserveAuctionCanceled', 'ReserveAuctionInvalidated'].includes(eventType)
  ) {
    const { auctionId } = decodedData;

    return {
      eventId: auctionId,
      eventType,
    };
  } else if (eventType === 'ReserveAuctionCreated') {
    const { seller, nftContract, tokenId, duration, reservePrice, auctionId } =
      decodedData;

    const price = reservePrice.toString() / 1e18;

    return {
      eventId: auctionId,
      userAddress: seller,
      collection: nftContract,
      tokenId,
      price,
      ethPrice: price,
      usdPrice: price * event.price,
      currencyAddress: nullAddress,
      eventType,
      duration,
    };
  } else if (eventType === 'ReserveAuctionUpdated') {
    const { auctionId, reservePrice } = decodedData;

    const price = reservePrice.toString() / 1e18;

    return {
      eventId: auctionId,
      eventType,
      price,
      ethPrice: price,
      usdPrice: price * event.price,
      currencyAddress: nullAddress,
    };
  }
};

module.exports = { abi, config, parse };
