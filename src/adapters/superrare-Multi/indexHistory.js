const { stripZerosLeft } = require('ethers');

const abi = require('./abi.json');
const config = require('./config.json');

const currencyAddress = '0000000000000000000000000000000000000000';

const parse = async (decodedData, event) => {
  const eventType = config.events.find(
    (e) => e.signatureHash === `0x${event.topic_0}`
  )?.name;

  if (['Bid', 'SetSalePrice', 'CancelBid'].includes(eventType)) {
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
      eventType,
    };
  }
};

module.exports = { abi, config, parse };
