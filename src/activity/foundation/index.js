const abi = require('../../adapters/foundation/abi.json');
const config = require('./config.json');

const parse = (decodedData, event) => {
  const { nftContract, tokenId, seller, price } = decodedData;

  const salePrice = price.toString() / 1e18;

  const collection = nftContract;
  return {
    collection,
    tokenId,
    salePrice,
    ethSalePrice: salePrice,
    usdSalePrice: salePrice * event.price,
    seller,
  };
};

module.exports = { abi, config, parse };
