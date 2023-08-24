const abi = require('./abi.json');
const config = require('./config.json');

const nullAddress = '0x0000000000000000000000000000000000000000';
const collection = '0xABB3738f04Dc2Ec20f4AE4462c3d069d02AE045B';

const parse = (decodedData, event) => {
  const eventType = config.events.find(
    (e) => e.signatureHash === `0x${event.topic_0}`
  )?.name;

  if (eventType === 'BuyNowPurchased') {
    const { _tokenId, _buyer, _currentOwner, _price } = decodedData;

    const salePrice = _price.toString() / 1e18;

    return {
      collection,
      tokenId: _tokenId,
      amount: 1,
      salePrice,
      ethSalePrice: salePrice,
      usdSalePrice: salePrice * event.price,
      paymentToken: nullAddress,
      seller: _currentOwner,
      buyer: _buyer,
    };
  } else if (eventType === 'ReserveAuctionResulted') {
    const { _id, _finalPrice, _currentOwner, _winner } = decodedData;

    const salePrice = _finalPrice.toString() / 1e18;

    return {
      collection,
      tokenId: _id,
      amount: 1,
      salePrice,
      ethSalePrice: salePrice,
      usdSalePrice: salePrice * event.price,
      paymentToken: nullAddress,
      seller: _currentOwner,
      buyer: _winner,
    };
  } else if (eventType === 'TokenBidAccepted') {
    const { _tokenId, _currentOwner, _bidder, _amount } = decodedData;

    const salePrice = _amount.toString() / 1e18;

    return {
      collection,
      tokenId: _tokenId,
      amount: 1,
      salePrice,
      ethSalePrice: salePrice,
      usdSalePrice: salePrice * event.price,
      paymentToken: nullAddress,
      seller: _currentOwner,
      buyer: _bidder,
    };
  }
};

module.exports = { abi, config, parse };
