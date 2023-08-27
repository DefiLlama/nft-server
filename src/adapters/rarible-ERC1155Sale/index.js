const abi = require('./abi.json');
const config = require('./config.json');
const { nullAddress } = require('../../utils/params');

const parse = async (decodedData, event) => {
  const { token, tokenId, owner, price, buyer, value } = decodedData;

  const salePrice = (price * value).toString() / 1e18;

  return {
    collection: token,
    tokenId,
    amount: value,
    salePrice,
    ethSalePrice: salePrice,
    usdSalePrice: salePrice * event.price,
    paymentToken: nullAddress,
    seller: owner,
    buyer,
  };
};

module.exports = { abi, config, parse };
