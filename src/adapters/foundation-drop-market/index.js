const abi = require('./abi.json');
const config = require('./config.json');
const { nullAddress } = require('../../utils/params');
const getEventType = require('../../utils/eventType');

const parse = (decodedData, event, events) => {
  const eventType = getEventType(config, event);

  if (eventType === 'MintFromFixedPriceDrop') {
    const { nftContract, buyer, firstTokenId, count, totalFees, creatorRev } =
      decodedData;

    const salePrice = (creatorRev + totalFees).toString() / 1e18;

    return {
      collection: nftContract,
      tokenId: firstTokenId,
      amount: count,
      salePrice,
      ethSalePrice: salePrice,
      usdSalePrice: salePrice * event.price,
      paymentToken: nullAddress,
      seller: nullAddress,
      buyer,
    };
  } else if (
    ['MintFromDutchAuction', 'MintFromDutchAuctionV2'].includes(eventType)
  ) {
    const { nftContract, buyer, pricePaidPerNft, count, firstTokenId } =
      decodedData;

    const salePrice = pricePaidPerNft.toString() / 1e18;

    return {
      collection: nftContract,
      tokenId: firstTokenId,
      amount: count,
      salePrice,
      ethSalePrice: salePrice,
      usdSalePrice: salePrice * event.price,
      paymentToken: nullAddress,
      seller: nullAddress,
      buyer,
    };
  } else if (eventType === 'CreateFixedPriceSale') {
    const { nftContract, seller, price: _price } = decodedData;

    const price = _price.toString() / 1e18;

    return {
      collection: nftContract,
      price,
      ethPrice: price,
      usdPrice: price * event.price,
      currencyAddress: nullAddress,
      userAddress: seller,
      eventType,
    };
  } else if (eventType === 'CreateLinearDutchAuction') {
    const { nftContract, seller, minPrice } = decodedData;

    const price = minPrice.toString() / 1e18;

    return {
      collection: nftContract,
      price,
      ethPrice: price,
      usdPrice: price * event.price,
      currencyAddress: nullAddress,
      userAddress: seller,
      eventType,
    };
  }
};

module.exports = { abi, config, parse };
