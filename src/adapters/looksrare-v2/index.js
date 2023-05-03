const abi = require('./abi.json');
const config = require('./config.json');

const parse = (decodedData, event) => {
  const { bidUser, currency, collection, itemIds, amounts, feeAmounts } =
    decodedData;

  const salePrice =
    feeAmounts.reduce((acc, val) => acc + val, BigInt(0)).toString() / 1e18;

  const seller =
    event.topic_0 ===
    '9aaa45d6db2ef74ead0751ea9113263d1dec1b50cea05f0ca2002cb8063564a4' // takerAsk
      ? decodedData.askUser
      : event.topic_0 ===
        '3ee3de4684413690dee6fff1a0a4f92916a1b97d1c5a83cdf24671844306b2e3' // takerBid
      ? decodedData.feeRecipients[0]
      : '';

  return {
    collection,
    tokenId: itemIds[0],
    amount: amounts[0],
    salePrice,
    ethSalePrice: salePrice,
    usdSalePrice: salePrice * event.price,
    paymentToken: currency,
    seller,
    buyer: bidUser,
  };
};

module.exports = {
  abi,
  config,
  parse,
};
