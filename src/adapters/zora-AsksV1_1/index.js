const abi = require('./abi.json');
const config = require('./config.json');
const getHistoricalTokenPrice = require('../../utils/price');

const ethPaymentTokens = [
  '0000000000000000000000000000000000000000',
  'c02aaa39b223fe8d0a0e5c4f27ead9083c756cc2',
].map((i) => `0x${i}`);

const parse = async (decodedData, event) => {
  const {
    tokenContract,
    tokenId,
    buyer,
    ask: { seller, askCurrency, askPrice },
  } = decodedData;

  const paymentInEth = ethPaymentTokens.includes(askCurrency?.toLowerCase());

  if (paymentInEth) {
    salePrice = ethSalePrice = askPrice.toString() / 1e18;
    usdSalePrice = ethSalePrice * event.price;
  } else {
    ({ salePrice, ethSalePrice, usdSalePrice, tokenPriceUsd } =
      await getHistoricalTokenPrice(event, askCurrency, askPrice));
  }

  return {
    collection: tokenContract,
    tokenId,
    amount: 1,
    salePrice,
    ethSalePrice: salePrice,
    usdSalePrice: salePrice * event.price,
    paymentToken: askCurrency,
    seller,
    buyer,
  };
};

module.exports = { abi, config, parse };
