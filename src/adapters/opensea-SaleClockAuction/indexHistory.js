const abi = require('./abi.json');
const config = require('./config.json');

const parse = (decodedData, event) => {
  const eventType = config.events.find(
    (e) => e.signatureHash === `0x${event.topic_0}`
  )?.name;

  if (eventType === 'AuctionCreated') {
    const { nftAddress, tokenId, startingPrice, duration } = decodedData;

    const price = startingPrice.toString() / 1e18;

    return {
      collection: nftAddress,
      tokenId,
      price,
      ethPrice: price,
      usdPrice: price * event.price,
      paymentToken: '0000000000000000000000000000000000000000',
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
