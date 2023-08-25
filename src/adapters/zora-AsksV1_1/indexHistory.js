const abi = require('./abi.json');
const config = require('./config.json');
const getPrice = require('../../utils/priceHistory');

const parse = async (decodedData, event) => {
  const eventType = config.events.find(
    (e) => e.signatureHash === `0x${event.topic_0}`
  )?.name;

  if (['AskCreated', 'AskCanceled', 'AskPriceUpdated'].includes(eventType)) {
    const {
      tokenContract,
      tokenId,
      ask: { seller, askCurrency, askPrice },
    } = decodedData;

    const { price, ethPrice, usdPrice } = await getPrice(
      askCurrency,
      askPrice,
      event
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
