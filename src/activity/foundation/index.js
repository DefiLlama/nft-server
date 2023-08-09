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
      price: null,
      ethPrice: null,
      usdPrice: null,
      address: null,
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
  }
};

module.exports = { abi, config, parse };
