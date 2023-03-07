const abi = require('./abi.json');
const config = require('./config.json');

const parse = (decodedData, event) => {
  const {
    sell: {
      trader,
      collection,
      tokenId,
      amount,
      paymentToken,
      price: salePrice,
    },
    buy,
  } = decodedData;

  const ethSalePrice = salePrice.toString() / 1e18;

  return {
    collection,
    tokenId,
    amount,
    ethSalePrice,
    usdSalePrice: ethSalePrice * event.price,
    paymentToken,
    seller: trader,
    buyer: buy[0],
  };
};

module.exports = { abi, config, parse };
