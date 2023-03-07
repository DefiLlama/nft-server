const abi = require('./abi.json');
const config = require('./config.json');

const parse = (decodedData, event) => {
  const { punkIndex, value, fromAddress, toAddress } = decodedData;

  const ethSalePrice = value.toString() / 1e18;

  return {
    collection: config.events[0].contract,
    tokenId: punkIndex,
    amount: 1,
    ethSalePrice,
    usdSalePrice: ethSalePrice * event.price,
    paymentToken: '0x0000000000000000000000000000000000000000',
    seller: fromAddress,
    buyer: toAddress,
  };
};

module.exports = { abi, config, parse };
