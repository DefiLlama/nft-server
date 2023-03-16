const abi = require('./abi.json');
const config = require('./config.json');

const parse = (decodedData, event) => {
  const { punkIndex, value, fromAddress, toAddress } = decodedData;

  const salePrice = value.toString() / 1e18;

  return {
    collection: config.contracts[0],
    tokenId: punkIndex,
    amount: 1,
    salePrice,
    ethSalePrice: salePrice,
    usdSalePrice: salePrice * event.price,
    paymentToken: '0x0000000000000000000000000000000000000000',
    seller: fromAddress,
    buyer: toAddress,
  };
};

module.exports = { abi, config, parse };
