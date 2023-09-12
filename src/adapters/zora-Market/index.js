const abi = require('./abi.json');
const config = require('./config.json');
const { getPrice } = require('../../utils/price');
const getEventType = require('../../utils/eventType');

const zoraMedia = '0xabEFBc9fD2F806065b4f3C237d4b59D9A97Bcac7';

const parse = async (decodedData, event) => {
  const eventType = getEventType(config, event);

  // note: BidFinalized sale event is excluded from this adapter, reason: zora-AuctionHouse
  // (0xE468cE99444174Bd3bBBEd09209577d25D1ad673) emits `AuctionEnded` in the same tx which
  // has more sale details

  if (['BidCreated', 'BidRemoved'].includes(eventType)) {
    const {
      tokenId,
      bid: { amount, currency, bidder, recipient, value },
    } = decodedData;

    const { price, ethPrice, usdPrice } = await getPrice(
      event,
      currency,
      amount
    );

    return {
      collection: zoraMedia,
      tokenId: tokenId,
      price,
      ethPrice,
      usdPrice,
      currencyAddress: currency,
      userAddress: bidder,
      eventType,
    };
  } else if (['AskCreated', 'AskRemoved'].includes(eventType)) {
    const {
      tokenId,
      ask: { amount, currency },
    } = decodedData;

    const { price, ethPrice, usdPrice } = await getPrice(
      event,
      currency,
      amount
    );

    return {
      collection: zoraMedia,
      tokenId: tokenId,
      price,
      ethPrice,
      usdPrice,
      currencyAddress: currency,
      userAddress: event.from_address,
      eventType,
    };
  }
};

module.exports = { abi, config, parse };
