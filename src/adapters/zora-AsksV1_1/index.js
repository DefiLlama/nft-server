const abi = require('./abi.json');
const config = require('./config.json');
const { getPrice } = require('../../utils/price');

const parse = async (decodedData, event) => {
  const eventType = config.events.find(
    (e) => e.signatureHash === `0x${event.topic_0}`
  )?.name;

  if (eventType === 'AskFilled') {
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
  } else if (
    ['AskCreated', 'AskCanceled', 'AskPriceUpdated'].includes(eventType)
  ) {
    const {
      tokenContract,
      tokenId,
      ask: { seller, askCurrency, askPrice },
    } = decodedData;

    const { price, ethPrice, usdPrice } = await getPrice(
      event,
      askCurrency,
      askPrice
    );

    return {
      collection: tokenContract,
      tokenId: tokenId,
      price,
      ethPrice,
      usdPrice,
      currencyAddress: askCurrency,
      userAddress: seller,
      eventType,
    };
  }
};

module.exports = { abi, config, parse };
