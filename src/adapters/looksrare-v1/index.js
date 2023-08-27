const { stripZerosLeft } = require('ethers');

const abi = require('./abi.json');
const config = require('./config.json');
const getEventType = require('../../utils/eventType');

const parse = (decodedData, event, events) => {
  const eventType = getEventType(config, event);

  const { maker, currency, collection, tokenId, amount, price } = decodedData;

  const royaltyEvent = events.find(
    (e) => e.transaction_hash === event.transaction_hash
  );

  let royaltyRecipient;
  let royaltyFeeEth;
  let royaltyFeeUsd;
  if (royaltyEvent) {
    royaltyRecipient = stripZerosLeft(`0x${royaltyEvent.topic_3}`);
    royaltyRaw = BigInt(`0x${royaltyEvent.data.slice(64)}`);
    royaltyFeeEth = royaltyRaw.toString() / 1e18;
    royaltyFeeUsd = royaltyFeeEth * event.price;
  }

  let buyer;
  let seller;

  if (eventType === 'TakerBid') {
    buyer = event.from_address;
    seller = maker;
  } else if (eventType === 'TakerAsk') {
    buyer = maker;
    seller = event.from_address;
  }
  const salePrice = price.toString() / 1e18;

  return {
    collection,
    tokenId,
    amount,
    salePrice,
    ethSalePrice: salePrice,
    usdSalePrice: salePrice * event.price,
    paymentToken: currency,
    seller,
    buyer,
    royaltyRecipient,
    royaltyFeeEth,
    royaltyFeeUsd,
  };
};

module.exports = {
  abi,
  config,
  parse,
};
