const abi = require('./abi.json');
const config = require('./config.json');
const { nullAddress } = require('../../utils/params');

const parse = (decodedData, event) => {
  const {
    maker,
    taker,
    item,
    intent,
    detail: { fees },
  } = decodedData;

  // INTENT_SELL = 1;
  // INTENT_AUCTION = 2;
  // INTENT_BUY = 3;

  const salePrice = item[0].toString() / 1e18;

  const itemData = item.getValue('data');

  const chunkSize = 64;
  const chunks = itemData
    .slice(2)
    .match(new RegExp(`.{1,${chunkSize}}`, 'g'))
    .map((chunk) => `0x${chunk}`);
  const collection = '0x' + chunks[2].slice(-40);
  const tokenId = parseInt(chunks.slice(-1));

  let royaltyRecipient;
  let percentage;
  let royaltyFeeEth;
  let royaltyFeeUsd;
  if (fees.length > 1) {
    ({ percentage, to: royaltyRecipient } = fees[1]);
    royaltyFeeEth = (salePrice * percentage.toString()) / 1e6;
    royaltyFeeUsd = royaltyFeeEth * event.price;
  }

  const seller = intent === 3n ? taker : maker;
  const buyer = intent === 3n ? maker : taker;

  return {
    collection,
    tokenId,
    amount: 1,
    salePrice,
    ethSalePrice: salePrice,
    usdSalePrice: salePrice * event.price,
    paymentToken: nullAddress,
    seller,
    buyer,
    royaltyRecipient,
    royaltyFeeEth,
    royaltyFeeUsd,
  };
};

module.exports = { abi, config, parse };
