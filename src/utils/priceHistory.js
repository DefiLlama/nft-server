const getHistoricalTokenPrice = require('./price');

const ethPaymentTokens = [
  '0000000000000000000000000000000000000000',
  'c02aaa39b223fe8d0a0e5c4f27ead9083c756cc2',
].map((i) => `0x${i}`);

const getPrice = async (currencyAddress, amount, event) => {
  let price;
  let ethPrice;
  let usdPrice;

  const paymentInEth = ethPaymentTokens.includes(
    currencyAddress?.toLowerCase()
  );

  if (paymentInEth) {
    price = ethPrice = amount.toString() / 1e18;
    usdPrice = ethPrice * event.price;
  } else {
    const prices = await getHistoricalTokenPrice(
      event,
      currencyAddress,
      amount
    );
    price = prices.salePrice;
    ethPrice = prices.ethSalePrice;
    usdPrice = prices.usdSalePrice;
  }

  return { price, ethPrice, usdPrice };
};

module.exports = getPrice;
