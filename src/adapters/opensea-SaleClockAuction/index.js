const abi = require('./abi.json');
const config = require('./config.json');
const { nullAddress } = require('../../utils/params');
const getEventType = require('../../utils/eventType');

const parse = (decodedData, event, events, interface, trace, traces) => {
  const eventType = getEventType(config, event);

  if (eventType === 'AuctionSuccessful') {
    const { nftAddress, tokenId, totalPrice, winner } = decodedData;

    const salePrice = totalPrice.toString() / 1e18;

    const seller = traces.find(
      (t) =>
        t.from_address === config.contracts[0].replace('0x', '').toLowerCase()
    )?.to_address;

    return {
      collection: nftAddress,
      tokenId,
      amount: 1,
      salePrice,
      ethSalePrice: salePrice,
      usdSalePrice: salePrice * event.price,
      paymentToken: nullAddress,
      seller,
      buyer: winner,
    };
  } else if (eventType === 'AuctionCreated') {
    const { nftAddress, tokenId, startingPrice, duration } = decodedData;

    const price = startingPrice.toString() / 1e18;

    return {
      collection: nftAddress,
      tokenId,
      price,
      ethPrice: price,
      usdPrice: price * event.price,
      paymentToken: nullAddress,
      userAddress: event.from_address,
      eventType,
      expiration: duration,
    };
  } else if (eventType === 'AuctionCancelled') {
    const { nftAddress, tokenId } = decodedData;

    return {
      collection: nftAddress,
      tokenId,
      userAddress: event.from_address,
      eventType,
    };
  }
};

module.exports = {
  abi,
  config,
  parse,
};
