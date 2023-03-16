const abi = require('./abi.json');
const config = require('./config.json');

const parse = (decodedData, event) => {
  const {
    sell: { trader, collection, tokenId, amount, paymentToken, price },
    buy,
  } = decodedData;

  // price = in eth
  const salePrice = price.toString() / 1e18;

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
  };
};

module.exports = { abi, config, parse };
