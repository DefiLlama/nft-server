const abi = require('./abi.json');
const config = require('./config.json');

const parse = async (decodedData, event) => {
  const { token, tokenId, owner, price, buyer, value } = decodedData;

  const salePrice = (price * value).toString() / 1e18;

  return {
    collection: token,
    tokenId,
    amount: value, // erc1155 only
    salePrice,
    ethSalePrice: salePrice,
    usdSalePrice: salePrice * event.price,
    paymentToken: '0x0000000000000000000000000000000000000000',
    seller: owner,
    buyer,
  };
};

module.exports = { abi, config, parse };
