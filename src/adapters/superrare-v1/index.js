const abi = require('./abi.json');
const config = require('./config.json');
const { nullAddress } = require('../../utils/params');

const currencyAddress = nullAddress;

const parse = async (decodedData, event) => {
  const eventType = config.events.find(
    (e) => e.signatureHash === `0x${event.topic_0}`
  )?.name;

  if (['AcceptBid', 'Sold'].includes(eventType)) {
    const { _bidder, _buyer, _seller, _amount, _tokenId } = decodedData;

    const salePrice = _amount.toString() / 1e18;

    return {
      collection: event.contract_address,
      tokenId: _tokenId,
      amount: 1,
      salePrice,
      ethSalePrice: salePrice,
      usdSalePrice: salePrice * event.price,
      paymentToken: nullAddress,
      seller: _seller,
      buyer: _buyer ?? _bidder,
    };
  } else if (['Bid', 'CancelBid'].includes(eventType)) {
    const { _bidder, _amount, _tokenId } = decodedData;

    const price = _amount.toString() / 1e18;

    return {
      collection: event.contract_address,
      tokenId: _tokenId,
      currencyAddress,
      price,
      ethPrice: price,
      usdPrice: price * event.price,
      userAddress: _bidder,
      eventType,
    };
  } else if (eventType === 'SalePriceSet') {
    const { _tokenId, _price } = decodedData;

    const price = _price.toString() / 1e18;

    return {
      collection: event.contract_address,
      tokenId: _tokenId,
      currencyAddress,
      price,
      ethPrice: price,
      usdPrice: price * event.price,
      userAddress: event.from_address,
      eventType,
    };
  }
};

module.exports = { abi, config, parse };
