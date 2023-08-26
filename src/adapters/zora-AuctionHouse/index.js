const abi = require('./abi.json');
const config = require('./config.json');

const ethPaymentTokens = [
  '0000000000000000000000000000000000000000',
  'c02aaa39b223fe8d0a0e5c4f27ead9083c756cc2',
].map((i) => `0x${i}`);

const parse = async (decodedData, event) => {
  const {
    tokenId,
    tokenContract,
    tokenOwner,
    winner,
    amount,
    auctionCurrency,
  } = decodedData;

  const paymentInEth = ethPaymentTokens.includes(
    auctionCurrency?.toLowerCase()
  );

  if (paymentInEth) {
    salePrice = ethSalePrice = amount.toString() / 1e18;
    usdSalePrice = ethSalePrice * event.price;
  } else {
    ({ salePrice, ethSalePrice, usdSalePrice, tokenPriceUsd } =
      await getHistoricalTokenPrice(event, auctionCurrency, amount));
  }

  return {
    collection: tokenContract,
    tokenId,
    amount: 1,
    salePrice,
    ethSalePrice: salePrice,
    usdSalePrice: salePrice * event.price,
    paymentToken: auctionCurrency,
    seller: tokenOwner,
    buyer: winner,
  };
};

module.exports = { abi, config, parse };
