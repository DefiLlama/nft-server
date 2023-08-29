const { stripZerosLeft } = require('ethers');

const abi = require('./abi.json');
const config = require('./config.json');
const { nullAddress } = require('../../utils/params');
const getEventType = require('../../utils/eventType');

const currencyAddress = nullAddress;

const parse = async (decodedData, event) => {
  const eventType = getEventType(config, event);

  if (['Sold', 'AcceptBid', 'settleAuctionPH'].includes(eventType)) {
    let _originContract;
    let _buyer;
    let _bidder;
    let _tokenId;
    let _seller;
    let _amount;

    // for some events we don't have an abi -> parse event manually
    if (eventType === 'settleAuctionPH') {
      _originContract = stripZerosLeft(`0x${event.topic_1}`);
      _buyer = stripZerosLeft(`0x${event.topic_2}`);
      _tokenId = BigInt(`0x${event.topic_3}`);
      _seller = stripZerosLeft(`0x${event.data.slice(0, 64)}`);
      _amount = BigInt(`0x${event.data.slice(64)}`);
    } else {
      ({ _originContract, _buyer, _bidder, _seller, _amount, _tokenId } =
        decodedData);
    }

    const salePrice = _amount.toString() / 1e18;

    return {
      collection: _originContract,
      tokenId: _tokenId,
      amount: 1,
      salePrice,
      ethSalePrice: salePrice,
      usdSalePrice: salePrice * event.price,
      paymentToken: nullAddress,
      seller: _seller,
      buyer: _buyer ?? _bidder,
    };
  } else if (['Bid', 'SetSalePrice', 'CancelBid'].includes(eventType)) {
    const { _originContract, _bidder, _amount, _tokenId } = decodedData;

    const price = _amount.toString() / 1e18;

    return {
      collection: _originContract,
      tokenId: _tokenId,
      currencyAddress,
      price,
      ethPrice: price,
      usdPrice: price * event.price,
      userAddress: _bidder ?? event.from_address,
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
  } else if (eventType === 'bidPH') {
    const _originContract = stripZerosLeft(`0x${event.topic_1}`);
    const _bidder = stripZerosLeft(`0x${event.topic_2}`);
    const _tokenId = BigInt(`0x${event.topic_3}`);
    const _amount = BigInt(`0x${event.data.slice(0, 64)}`);

    const price = _amount.toString() / 1e18;

    return {
      collection: _originContract,
      tokenId: _tokenId,
      userAddress: _bidder,
      price,
      ethPrice: price,
      usdPrice: price * event.price,
      currencyAddress,
      eventType,
    };
  } else if (eventType === 'createColdieAuctionPH') {
    const _originContract = stripZerosLeft(`0x${event.topic_1}`);
    const _tokenId = BigInt(`0x${event.topic_2}`);
    const userAddress = stripZerosLeft(`0x${event.topic_3}`);
    const _amount = BigInt(`0x${event.data.slice(0, 64)}`);

    const price = _amount.toString() / 1e18;

    return {
      collection: _originContract,
      tokenId: _tokenId,
      userAddress,
      price,
      ethPrice: price,
      usdPrice: price * event.price,
      currencyAddress,
      eventType,
    };
  } else if (eventType === 'createScheduledAuctionPH') {
    const _originContract = stripZerosLeft(`0x${event.topic_1}`);
    const _tokenId = BigInt(`0x${event.topic_2}`);
    const userAddress = stripZerosLeft(`0x${event.topic_3}`);
    const _amount = BigInt(`0x${event.data.slice(64, 128)}`);

    const price = _amount.toString() / 1e18;

    return {
      collection: _originContract,
      tokenId: _tokenId,
      userAddress,
      price,
      ethPrice: price,
      usdPrice: price * event.price,
      currencyAddress,
      eventType,
    };
  }
};

module.exports = { abi, config, parse };
