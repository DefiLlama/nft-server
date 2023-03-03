const abi = require('./abi.json');
const config = require('./config.json');

const parse = (data, topics, interface, eventName, event) => {
  const { maker, taker, item } = interface.decodeEventLog(
    eventName,
    data,
    topics
  );

  const ethSalePrice = item[0].toString() / 1e18;

  const itemData = item.getValue('data');

  const chunkSize = 64;
  const chunks = itemData
    .slice(2)
    .match(new RegExp(`.{1,${chunkSize}}`, 'g'))
    .map((chunk) => `0x${chunk}`);
  const collection = '0x' + chunks[2].slice(-40);
  const tokenId = parseInt(chunks.slice(-1));

  return {
    collection,
    tokenId,
    amount: 1,
    ethSalePrice,
    usdSalePrice: ethSalePrice * event.price,
    paymentToken: '0x0000000000000000000000000000000000000000',
    seller: maker,
    buyer: taker,
  };
};

module.exports = { abi, config, parse };
