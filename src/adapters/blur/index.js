const abi = require('./abi.json');
const config = require('./config.json');

const parse = (decodedData, event) => {
  const {
    sell: { trader, collection, tokenId, amount, paymentToken, price, fees },
    buy,
  } = decodedData;

  // price = in eth
  const salePrice = price.toString() / 1e18;

  let royaltyRecipient;
  let royaltyFeeEth;
  let royaltyFeeUsd;
  if (fees.length > 0) {
    ({ rate, recipient: royaltyRecipient } = fees[0]);
    royaltyFeeEth = (salePrice * rate.toString()) / 1e4;
    royaltyFeeUsd = royaltyFeeEth * event.price;
  }

  return {
    collection,
    tokenId,
    amount,
    salePrice,
    ethSalePrice: salePrice,
    usdSalePrice: salePrice * event.price,
    paymentToken,
    seller: trader,
    buyer: buy[0],
    royaltyRecipient,
    royaltyFeeEth,
    royaltyFeeUsd,
  };
};

module.exports = { abi, config, parse };
