const axios = require('axios');
const axiosRetry = require('axios-retry');

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
  };
};

module.exports = getHistoricalTokenPrice;
