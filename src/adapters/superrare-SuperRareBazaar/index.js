const { stripZerosLeft } = require('ethers');

const abi = require('./abi.json');
const config = require('./config.json');
const { getPrice } = require('../../utils/price');
const getEventType = require('../../utils/eventType');

const parse = async (decodedData, event) => {
  const eventType = getEventType(config, event);

  if (['Sold', 'AcceptOffer', 'AuctionSettled'].includes(eventType)) {
    const {
      _originContract,
      _buyer,
      _seller,
      _currencyAddress,
      _amount,
      _tokenId,
      _bidder,
    } = decodedData;

    const prices = await getPrice(event, _currencyAddress, _amount);

    return {
      collection: _originContract ?? stripZerosLeft(`0x${event.topic_1}`),
      tokenId: _tokenId,
      amount: 1,
      salePrice: prices.price,
      ethSalePrice: prices.ethPrice,
      usdSalePrice: prices.usdPrice,
      paymentToken: _currencyAddress,
      seller: _seller,
      buyer: _buyer ?? _bidder,
    };
  } else if (eventType === 'AuctionBid') {
    const { _contractAddress, _bidder, _tokenId, _currencyAddress, _amount } =
      decodedData;

    const { price, ethPrice, usdPrice } = await getPrice(
      event,
      _currencyAddress,
      _amount
    );

    return {
      collection: _contractAddress,
      tokenId: _tokenId,
      currencyAddress: _currencyAddress,
      price,
      ethPrice,
      usdPrice,
      userAddress: _bidder,
      eventType,
    };
  } else if (eventType === 'CancelAuction') {
    const { _contractAddress, _tokenId, _auctionCreator } = decodedData;

    return {
      collection: _contractAddress,
      tokenId: _tokenId,
      userAddress: _auctionCreator,
      eventType,
    };
  } else if (['CancelOffer', 'OfferPlaced'].includes(eventType)) {
    const { _originContract, _bidder, _currencyAddress, _amount, _tokenId } =
      decodedData;

    const { price, ethPrice, usdPrice } = await getPrice(
      event,
      _currencyAddress,
      _amount
    );

    return {
      collection: _originContract,
      tokenId: _tokenId,
      currencyAddress: _currencyAddress,
      userAddress: _bidder,
      price,
      ethPrice,
      usdPrice,
      eventType,
    };
  } else if (eventType === 'NewAuction') {
    const {
      _contractAddress,
      _tokenId,
      _auctionCreator,
      _currencyAddress,
      _startingTime,
      _minimumBid,
    } = decodedData;

    const { price, ethPrice, usdPrice } = await getPrice(
      event,
      _currencyAddress,
      _minimumBid
    );

    return {
      collection: _contractAddress,
      tokenId: _tokenId,
      userAddress: _auctionCreator,
      currencyAddress: _currencyAddress,
      startTime: _startingTime,
      price,
      ethPrice,
      usdPrice,
      eventType,
    };
  } else if (eventType === 'SetSalePrice') {
    const {
      _originContract,
      _currencyAddress,
      _amount,
      _tokenId,
      _splitRecipients,
    } = decodedData;

    const { price, ethPrice, usdPrice } = await getPrice(
      event,
      _currencyAddress,
      _amount
    );

    return {
      collection: _originContract,
      tokenId: _tokenId,
      userAddress: _splitRecipients.length ? _splitRecipients[0] : null,
      currencyAddress: _currencyAddress,
      price,
      ethPrice,
      usdPrice,
      eventType,
    };
  }
};

module.exports = { abi, config, parse };
