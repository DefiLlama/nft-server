const abi = require('./abi.json');
const config = require('./config.json');
const { getPrice } = require('../../utils/price');
const { nullAddress } = require('../../utils/params');
const getEventType = require('../../utils/eventType');

const parse = async (decodedData, event) => {
  const eventType = getEventType(config, event);

  if (eventType === 'AuctionEnded') {
    const {
      tokenId,
      tokenContract,
      tokenOwner,
      winner,
      amount,
      auctionCurrency,
    } = decodedData;

    const prices = await getPrice(event, auctionCurrency, amount);

    return {
      collection: tokenContract,
      tokenId,
      amount: 1,
      salePrice: prices.price,
      ethSalePrice: prices.ethPrice,
      usdSalePrice: prices.usdPrice,
      paymentToken: auctionCurrency,
      seller: tokenOwner,
      buyer: winner,
    };
  } else if (eventType === 'AuctionCreated') {
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
      event,
      auctionCurrency,
      reservePrice
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
