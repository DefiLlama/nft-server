const abi = require('./abi.json');
const config = require('./config.json');

const parse = (decodedData, event) => {
  const {
    nftContract,
    tokenId,
    seller,
    buyer,
    creatorRev,
    sellerRev,
    totalFees,
  } = decodedData;

  const salePrice = (creatorRev + sellerRev + totalFees).toString() / 1e18;

  return {
    collection: nftContract,
    tokenId,
    amount: 1,
    salePrice,
    ethSalePrice: salePrice,
    usdSalePrice: salePrice * event.price,
    paymentToken: '0x0000000000000000000000000000000000000000',
    seller,
    buyer,
  };
};

module.exports = { abi, config, parse };
