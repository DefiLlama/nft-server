const abi = require('./abi.json');
const config = require('./config.json');
const { nullAddress } = require('../../utils/params');
const getEventType = require('../../utils/eventType');

const parse = (decodedData, event, events, interface) => {
  const eventType = getEventType(config, event);

  if (eventType === 'AuctionSettled') {
    const txData = `0x${event.tx_data}`;
    const funcSigHash = txData.slice(0, 10);

    const {
      nftOwner,
      nftContract,
      nftId,
      bidWinner: { amount, winner },
    } = interface.decodeFunctionData(funcSigHash, txData);

    const salePrice = amount.toString() / 1e18;

    return {
      collection: nftContract,
      tokenId: nftId,
      amount: 1,
      salePrice,
      ethSalePrice: salePrice,
      usdSalePrice: salePrice * event.price,
      paymentToken: nullAddress,
      seller: nftOwner,
      buyer: winner,
    };
  } else if (eventType === 'ordersMatched') {
    const txData = `0x${event.tx_data}`;
    const funcSigHash = txData.slice(0, 10);

    const {
      nftContract,
      nftId,
      sequencerStamp: { amount, buyer, seller },
    } = interface.decodeFunctionData(funcSigHash, txData);

    const salePrice = amount.toString() / 1e18;

    return {
      collection: nftContract,
      tokenId: nftId,
      amount: 1,
      salePrice,
      ethSalePrice: salePrice,
      usdSalePrice: salePrice * event.price,
      paymentToken: nullAddress,
      seller,
      buyer,
    };
  } else if (eventType === 'AuctionCancelled') {
    const { auctionId } = decodedData;

    return {
      auctionId,
      userAddress: event.from_address,
      eventType,
    };
  } else if (eventType === 'AuctionCreated') {
    const { owner, nftContract, auctionDuration, auctionType, nftId, reserve } =
      decodedData;

    const price = reserve.toString() / 1e18;

    return {
      eventType,
      collection: nftContract,
      tokenId: nftId,
      amount: 1,
      price,
      ethPrice: price,
      usdPrice: price * event.price,
      currencyAddress: nullAddress,
      userAddress: owner,
      expiration: auctionDuration,
    };
  }
};

module.exports = { abi, config, parse };
