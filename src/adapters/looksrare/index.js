const abi = require('./abi.json');
const config = require('./config.json');

const parse = (decodedData, event) => {
  const {
    taker,
    maker,
    currency,
    collection,
    tokenId,
    amount,
    price: ethPrice,
  } = decodedData;

  const ethSalePrice = ethPrice.toString() / 1e18;

  return {
    collection,
    tokenId,
    amount,
    ethSalePrice,
    usdSalePrice: ethSalePrice * event.price,
    paymentToken: currency,
    seller: maker,
    buyer: taker,
  };
};

module.exports = { abi, config, parse };
