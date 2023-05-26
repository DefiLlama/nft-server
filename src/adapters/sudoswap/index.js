const abi = require('./abi.json');
const config = require('./config.json');

const parse = (decodedData, event) => {
  return {
    collection,
    tokenId,
    amount,
    salePrice,
    ethSalePrice: salePrice,
    usdSalePrice: salePrice * event.price,
    paymentToken,
    seller,
    buyer,
  };
};

module.exports = { abi, config, parse };
