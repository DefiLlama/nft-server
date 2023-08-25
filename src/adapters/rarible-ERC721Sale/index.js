const abi = require('./abi.json');
const config = require('./config.json');

const parse = async (decodedData, event) => {
  const { token, tokenId, seller, buyer, price } = decodedData;

  const salePrice = price.toString() / 1e18;

  return {
    collection: token,
    tokenId,
    amount: 1, // erc721 only
    salePrice,
    ethSalePrice: salePrice,
    usdSalePrice: salePrice * event.price,
    paymentToken: '0x0000000000000000000000000000000000000000',
    seller,
    buyer,
  };
};

module.exports = { abi, config, parse };
