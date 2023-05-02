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

  let royaltyRecipient;
  if (creatorRev > 0) {
    ethRoyalty = (creatorRev.toString() / 1e18) * salePrice;
    usdRoyalty = ethRoyalty * event.price;
  }

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
    royaltyRecipient,
    ethRoyalty,
    usdRoyalty,
  };
};

module.exports = { abi, config, parse };
