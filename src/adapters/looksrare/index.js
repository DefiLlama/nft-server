const { stripZerosLeft } = require('ethers');

const abi = require('./abi.json');
const config = require('./config.json');

const parse = (decodedData, event, events) => {
  const { maker, currency, collection, tokenId, amount, price } = decodedData;

  const royaltyEvent = events.find(
    (e) => e.transaction_hash === event.transaction_hash
  );

  let royaltyRecipient;
  let ethRoyalty;
  let usdRoyalty;
  if (royaltyEvent) {
    royaltyRecipient = stripZerosLeft(`0x${royaltyEvent.topic_3}`);
    royaltyRaw = BigInt(`0x${royaltyEvent.data.slice(64)}`);
    ethRoyalty = royaltyRaw.toString() / 1e18;
    usdRoyalty = ethRoyalty * event.price;
  }

  let buyer;
  let seller;

  // --looksrare v1 (no longer active since 13th april)
  if (
    // takerBid
    event.topic_0 ===
    '95fb6205e23ff6bda16a2d1dba56b9ad7c783f67c96fa149785052f47696f2be'
  ) {
    buyer = event.from_address;
    seller = maker;
  } else if (
    // takerAsk
    event.topic_0 ===
    '68cd251d4d267c6e2034ff0088b990352b97b2002c0476587d0c4da889c11330'
  ) {
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
    ethRoyalty,
    usdRoyalty,
  };
};

module.exports = {
  abi,
  config,
  parse,
};
