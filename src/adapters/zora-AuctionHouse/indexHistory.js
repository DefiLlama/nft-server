const abi = require('./abi.json');
const config = require('./config.json');
const getPrice = require('../../utils/priceHistory');

const nullAddress = '0000000000000000000000000000000000000000';

const parse = async (decodedData, event) => {
  const eventType = config.events.find(
    (e) => e.signatureHash === `0x${event.topic_0}`
  )?.name;

  if (eventType === 'AuctionCreated') {
    const {
      auctionId,
      tokenId,
      tokenContract,
      duration,
      reservePrice,
      tokenOwner,
      auctionCurrency,
    } = decodedData;

    const { price, ethPrice, usdPrice } = await getPrice(
      auctionCurrency,
      reservePrice,
      event
    );

    return {
      collection: tokenContract,
      tokenId: tokenId,
      price,
      ethPrice,
      usdPrice,
      currencyAddress: auctionCurrency,
      userAddress: tokenOwner,
      eventId: auctionId,
      expiration: duration,
      eventType,
    };
  } else if (eventType === 'AuctionBid') {
    const { auctionId, tokenId, tokenContract, sender, value } = decodedData;

    // note: i don't know how to obtain the currency address (its not part of the bid event)
    // so the assumption of eth might be wrong
    const price = value.toString() / 1e18;

    return {
      collection: tokenContract,
      tokenId: tokenId,
      price,
      ethPrice: price,
      usdPrice: price * event.price,
      currencyAddress: nullAddress,
      userAddress: event.from_address,
      eventId: auctionId,
      eventType,
    };
  } else if (eventType === 'AuctionReservePriceUpdated') {
    const { auctionId, tokenId, tokenContract, reservePrice } = decodedData;

    // note: i don't know how to obtain the currency address (its not part of the bid event)
    // so the assumption of eth might be wrong
    const price = reservePrice.toString() / 1e18;

    return {
      collection: tokenContract,
      tokenId: tokenId,
      price,
      ethPrice: price,
      usdPrice: price * event.price,
      currencyAddress: nullAddress,
      userAddress: event.from_address,
      eventId: auctionId,
      eventType,
    };
  } else if (eventType === 'AuctionCanceled') {
    const { auctionId, tokenId, tokenContract, tokenOwner } = decodedData;

    return {
      collection: tokenContract,
      tokenId: tokenId,
      userAddress: tokenOwner,
      eventId: auctionId,
      eventType,
    };
  }
};

module.exports = { abi, config, parse };
