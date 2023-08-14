const abi = require('../../trades/makersplace/abi.json');
const config = require('./config.json');

const nullAddress = '0000000000000000000000000000000000000000';

const parse = (decodedData, event) => {
  const eventType = config.events.find(
    (e) => e.signatureHash === `0x${event.topic_0}`
  )?.name;

  if (eventType === 'SaleCanceledEvent') {
    const { tokenId, tokenContractAddress } = decodedData;

    return {
      tokenId,
      collection: tokenContractAddress,
      eventType,
    };
  } else if (eventType === 'SaleCreatedEvent') {
    const { tokenId, tokenContractAddress, priceInWei } = decodedData;

    const price = priceInWei.toString() / 1e18;

    return {
      tokenId,
      collection: tokenContractAddress,
      price,
      ethPrice: price,
      usdPrice: price * event.price,
      currencyAddress: nullAddress,
      eventType,
    };
  } else if (eventType === 'TokenBidCreatedEvent') {
    const { tokenId, tokenAddress, bidId, bidPrice, bidder } = decodedData;

    const price = bidPrice.toString() / 1e18;

    return {
      tokenId,
      collection: tokenAddress,
      eventId: bidId,
      price,
      ethPrice: price,
      usdPrice: price * event.price,
      currencyAddress: nullAddress,
      userAddress: bidder,
      eventType,
    };
  } else if (eventType === 'TokenBidRemovedEvent') {
    const { tokenId, tokenAddress, bidId } = decodedData;

    return {
      tokenId,
      collection: tokenAddress,
      eventId: bidId,
      eventType,
    };
  }
};

module.exports = { abi, config, parse };
