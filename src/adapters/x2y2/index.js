const abi = require('./abi.json');
const config = require('./config.json');

const parse = (decodedData, event) => {
  const {
    maker,
    taker,
    item,
    detail: { fees },
  } = decodedData;

  const salePrice = item[0].toString() / 1e18;

  const itemData = item.getValue('data');

  const chunkSize = 64;
  const chunks = itemData
    .slice(2)
    .match(new RegExp(`.{1,${chunkSize}}`, 'g'))
    .map((chunk) => `0x${chunk}`);
  const collection = '0x' + chunks[2].slice(-40);
  const tokenId = parseInt(chunks.slice(-1));

  let royaltyRecipient;
  let percentage;
  let ethRoyalty;
  let usdRoyalty;
  if (fees.length > 1) {
    ({ percentage, to: royaltyRecipient } = fees[1]);
    ethRoyalty = (salePrice * percentage.toString()) / 1e6;
    usdRoyalty = ethRoyalty * event.price;
  }

  return {
    collection,
    tokenId,
    amount: 1,
    salePrice,
    ethSalePrice: salePrice,
    usdSalePrice: salePrice * event.price,
    paymentToken: '0x0000000000000000000000000000000000000000',
    seller: maker,
    buyer: taker,
    royaltyRecipient,
    ethRoyalty,
    usdRoyalty,
  };
};

module.exports = { abi, config, parse };
