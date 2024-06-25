const abi = require('./abi.json');
const config = require('./config.json');
const { getPrice } = require('../../utils/price');

const parse = async (decodedData, event) => {
  const {
    seller,
    buyer,
    tokenAddress,
    paymentCoin,
    tokenId,
    amount,
    salePrice,
  } = decodedData;

  const prices = await getPrice(event, paymentCoin, salePrice);

  return {
    collection: tokenAddress,
    tokenId: tokenId,
    amount: amount ?? 1, // undefined for erc721 events
    salePrice: prices.price,
    ethSalePrice: prices.ethPrice,
    usdSalePrice: prices.usdPrice,
    paymentToken: paymentCoin,
    seller,
    buyer,
  };
};

module.exports = { abi, config, parse };
