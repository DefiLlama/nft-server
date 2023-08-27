const abi = require('./abi.json');
const config = require('./config.json');
const { nullAddress } = require('../../utils/params');

const parse = async (decodedData, event) => {
  const { token, tokenId, seller, buyer, price } = decodedData;

  const salePrice = price.toString() / 1e18;

  return {
    collection: token,
    tokenId,
    amount: 1,
    salePrice,
    ethSalePrice: salePrice,
    usdSalePrice: salePrice * event.price,
    paymentToken: nullAddress,
    seller,
    buyer,
  };
};

module.exports = { abi, config, parse };
