const axios = require('axios');
const axiosRetry = require('axios-retry');

const { ethPaymentTokens } = require('./params');

axiosRetry(axios, {
  retries: 3,
  retryDelay: axiosRetry.exponentialDelay,
});

const getHistoricalTokenPrice = async (event, token, amount) => {
  const timestamp = Math.round(Number(event.block_time) / 1000);
  const key = `ethereum:${token}`;
  const url = `https://coins.llama.fi/prices/historical/${timestamp}/${key}`;
  const response = (await axios.get(url)).data?.coins[key];

  const salePrice = amount?.toString() / 10 ** response?.decimals;
  const usdSalePrice = salePrice * response?.price;
  const ethSalePrice = usdSalePrice / event.price;

  return {
    salePrice,
    ethSalePrice,
    usdSalePrice,
    tokenPriceUsd: response?.price,
    tokenDecimals: response?.decimals,
  };
};

const getPrice = async (event, token, amount) => {
  let price;
  let ethPrice;
  let usdPrice;

  const paymentInEth = ethPaymentTokens.includes(token?.toLowerCase());

  if (paymentInEth) {
    price = ethPrice = amount.toString() / 1e18;
    usdPrice = ethPrice * event.price;
  } else {
    const prices = await getHistoricalTokenPrice(event, token, amount);
    price = prices.salePrice;
    ethPrice = prices.ethSalePrice;
    usdPrice = prices.usdSalePrice;
  }

  return { price, ethPrice, usdPrice };
};

module.exports = { getHistoricalTokenPrice, getPrice };
