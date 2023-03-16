const abi = require('./abi.json');
const config = require('./config.json');

const parse = (decodedData, event) => {
  const { taker, maker, currency, collection, tokenId, amount, price } =
    decodedData;

  const salePrice = price.toString() / 1e18;

  return {
    collection,
    tokenId,
    amount,
    salePrice,
    ethSalePrice: salePrice,
    usdSalePrice: salePrice * event.price,
    paymentToken: currency,
    seller: maker,
    buyer: taker,
  };
};

module.exports = { abi, config, parse };
