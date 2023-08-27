const abi = require('./abi.json');
const config = require('./config.json');
const { getPrice } = require('../../utils/price');

const parse = async (decodedData, event) => {
  const {
    tokenId,
    tokenContract,
    tokenOwner,
    winner,
    amount,
    auctionCurrency,
  } = decodedData;

  const prices = await getPrice(event, auctionCurrency, amount);

  return {
    collection: tokenContract,
    tokenId,
    amount: 1,
    salePrice: prices.price,
    ethSalePrice: prices.ethPrice,
    usdSalePrice: prices.usdPrice,
    paymentToken: auctionCurrency,
    seller: tokenOwner,
    buyer: winner,
  };
};

module.exports = { abi, config, parse };
