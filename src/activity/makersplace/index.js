const abi = require('../../adapters/makersplace/abi.json');
const config = require('./config.json');

const parse = (decodedData, event) => {
  const activity = config.events.find(
    (e) => e.signatureHash === `0x${event.topic_0}`
  )?.name;

  if (activity === 'SaleCanceledEvent') {
    const { tokenId, tokenContractAddress } = decodedData;

    return {
      tokenId,
      collection: tokenContractAddress,
      activity,
    };
  } else if (activity === 'SaleCreatedEvent') {
    const { tokenId, tokenContractAddress, priceInWei } = decodedData;

    const price = priceInWei.toString() / 1e18;

    return {
      tokenId,
      collection: tokenContractAddress,
      price,
      ethPrice: price,
      usdPrice: price * event.price,
      activity,
    };
  } else if (activity === 'TokenBidCreatedEvent') {
    const { tokenId, tokenAddress, bidId, bidPrice, bidder } = decodedData;

    const price = bidPrice.toString() / 1e18;

    return {
      tokenId,
      collection: tokenAddress,
      bidId,
      price,
      ethPrice: price,
      usdPrice: price * event.price,
      address: bidder,
      activity,
    };
  } else if (activity === 'TokenBidRemovedEvent') {
    const { tokenId, tokenAddress, bidId } = decodedData;

    return {
      tokenId,
      collection: tokenAddress,
      bidId,
      activity,
    };
  }
};

module.exports = { abi, config, parse };
