const abi = require('./abi.json');
const abiV2 = require('./abiV2.json');
const config = require('./config.json');

const parse = (decodedData, event) => {
  let buyer;
  let seller;
  let collection;
  let tokenId;
  let amount;
  let price;

  // --looksrare v1 (no longer active since 13th april)
  if (
    // takerBid
    event.topic_0 ===
    '95fb6205e23ff6bda16a2d1dba56b9ad7c783f67c96fa149785052f47696f2be'
  ) {
    buyer = event.from_address;
    seller = decodedData.maker;
    collection = decodedData.collection;
    tokenId = decodedData.tokenId;
    amount = decodedData.amount;
    price = decodedData.price;
  } else if (
    // takerAsk
    event.topic_0 ===
    '68cd251d4d267c6e2034ff0088b990352b97b2002c0476587d0c4da889c11330'
  ) {
    buyer = decodedData.maker;
    seller = event.from_address;
    collection = decodedData.collection;
    tokenId = decodedData.tokenId;
    amount = decodedData.amount;
    price = decodedData.price;
    // --looksrare v2
  } else if (
    // takerAsk
    event.topic_0 ===
    '9aaa45d6db2ef74ead0751ea9113263d1dec1b50cea05f0ca2002cb8063564a4'
  ) {
    buyer = decodedData.bidUser;
    seller = decodedData.askUser;
    currency = decodedData.currency;
    collection = decodedData.collection;
    tokenId = decodedData.itemIds[0];
    amount = decodedData.amounts[0];
    price = decodedData.feeAmounts.reduce((acc, val) => acc + val, BigInt(0));
  } else if (
    event.topic_0 ===
    '3ee3de4684413690dee6fff1a0a4f92916a1b97d1c5a83cdf24671844306b2e3'
  ) {
    buyer = decodedData.bidUser;
    seller = decodedData.feeRecipients[0];
    currency = decodedData.currency;
    collection = decodedData.collection;
    tokenId = decodedData.itemIds[0];
    amount = decodedData.amounts[0];
    price = decodedData.feeAmounts.reduce((acc, val) => acc + val, BigInt(0));
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
  };
};

module.exports = {
  abi: [...abi, ...abiV2].filter((a) => a.type === 'event'),
  config,
  parse,
};
