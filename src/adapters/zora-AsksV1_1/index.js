const abi = require('./abi.json');
const config = require('./config.json');
const { getPrice } = require('../../utils/price');

const parse = async (decodedData, event) => {
  const {
    tokenContract,
    tokenId,
    buyer,
    ask: { seller, askCurrency, askPrice },
  } = decodedData;

  const prices = await getPrice(event, askCurrency, askPrice);

  return {
    collection: tokenContract,
    tokenId,
    amount: 1,
    salePrice: prices.price,
    ethSalePrice: prices.ethPrice,
    usdSalePrice: prices.usdPrice,
    paymentToken: askCurrency,
    seller,
    buyer,
  };
};

module.exports = { abi, config, parse };
