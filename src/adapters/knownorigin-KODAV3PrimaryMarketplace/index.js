const { stripZerosLeft } = require('ethers');

const abi = require('./abi.json');
const config = require('./config.json');
const { nftTransferEvents, nullAddress } = require('../../utils/params');
const getEventType = require('../../utils/eventType');

const collection = '0xABB3738f04Dc2Ec20f4AE4462c3d069d02AE045B';

const parse = (decodedData, event, events) => {
  const eventType = getEventType(config, event);

  if (
    [
      'BuyNowPurchased',
      'EditionBidAccepted',
      'ReserveAuctionResulted',
    ].includes(eventType)
  ) {
    const transfers = events.filter(
      (e) => e.transaction_hash === event.transaction_hash
    );

    // erc20 transfers
    const transfersERC20 = transfers.filter(
      (e) =>
        e.topic_0 === nftTransferEvents['erc721_Transfer'] && e.topic_3 === null
    );
    const transfersERC20LogIndices = transfersERC20.map((i) => i.log_index);

    // erc721/erc1155 transfers
    const transfersNFT = transfers.filter(
      (e) => !transfersERC20LogIndices.includes(e.log_index)
    );

    if (!transfersNFT.length) return {};

    const transferEventNFT =
      transfersNFT?.length === 1
        ? transfersNFT[0]
        : transfersNFT.find(
            (tf) =>
              tf.topic_1.includes(event.from_address) ||
              tf.topic_2.includes(event.from_address) ||
              tf.topic_3.includes(event.from_address)
          );

    if (!transferEventNFT) return {};

    const activity = config.events.find(
      (e) => e.signatureHash === `0x${event.topic_0}`
    )?.name;

    const paymentToken = nullAddress;
    const amount = 1;

    let tokenId;
    let salePrice;
    let seller;
    let buyer;
    let royaltyFeeEth;
    let royaltyFeeUsd;
    let royaltyRecipient;

    if (activity === 'BuyNowPurchased') {
      const { _tokenId, _buyer, _currentOwner, _price } = decodedData;

      tokenId = _tokenId;
      seller = _currentOwner;
      buyer = _buyer;
      salePrice = _price.toString() / 1e18;
    } else if (
      ['EditionBidAccepted', 'ReserveAuctionResulted'].includes(activity)
    ) {
      const { _amount, _finalPrice } = decodedData;
      const price = _amount ?? _finalPrice;
      salePrice = price.toString() / 1e18;

      if (transferEventNFT.topic_0 === nftTransferEvents['erc721_Transfer']) {
        seller = stripZerosLeft(`0x${transferEventNFT.topic_1}`);
        buyer = stripZerosLeft(`0x${transferEventNFT.topic_2}`);
        tokenId = BigInt(`0x${transferEventNFT.topic_3}`);
      } else if (
        transferEventNFT.topic_0 === nftTransferEvents['erc1155_TransferSingle']
      ) {
        tokenId = BigInt(`0x${transferEventNFT.data.slice(0, 64)}`);
        seller = stripZerosLeft(`0x${transferEventNFT.topic_2}`);
        buyer = stripZerosLeft(`0x${transferEventNFT.topic_3}`);
      }
    }

    return {
      collection,
      tokenId,
      amount,
      salePrice,
      ethSalePrice: salePrice,
      usdSalePrice: salePrice * event.price,
      paymentToken,
      seller,
      buyer,
      royaltyRecipient,
      royaltyFeeEth,
      royaltyFeeUsd,
    };
  } else if (eventType === 'BidPlacedOnReserveAuction') {
    const { _id, _bidder, _amount, _currentBiddingEnd } = decodedData;

    const price = _amount.toString() / 1e18;

    return {
      collection,
      tokenId: _id,
      price,
      ethPrice: price,
      usdPrice: price * event.price,
      userAddress: _bidder,
      expiration: _currentBiddingEnd,
      currencyAddress: nullAddress,
      eventType,
    };
  } else if (eventType === 'BidWithdrawnFromReserveAuction') {
    const { _id, _bidder } = decodedData;

    return {
      collection,
      tokenId: _id,
      userAddress: _bidder,
      eventType,
    };
  } else if (eventType === 'BuyNowPriceChanged') {
    const { _id, _price } = decodedData;

    const price = _price.toString() / 1e18;

    return {
      collection,
      tokenId: _id,
      price,
      ethPrice: price,
      usdPrice: price * event.price,
      currencyAddress: nullAddress,
      userAddress: event.from_address,
      eventType,
    };
  } else if (eventType === 'ConvertFromBuyNowToOffers') {
    const { _editionId } = decodedData;

    return {
      collection,
      tokenId: _editionId,
      userAddress: event.from_address,
      eventType,
    };
  } else if (eventType === 'ConvertSteppedAuctionToBuyNow') {
    const { _editionId, _listingPrice } = decodedData;

    const price = _listingPrice.toString() / 1e18;

    return {
      collection,
      tokenId: _editionId,
      price,
      ethPrice: price,
      usdPrice: price * event.price,
      currencyAddress: nullAddress,
      userAddress: event.from_address,
      eventType,
    };
  } else if (eventType === 'ListedForBuyNow') {
    const { _id, _price, _currentOwner } = decodedData;

    const price = _price.toString() / 1e18;

    return {
      collection,
      tokenId: _id,
      price,
      ethPrice: price,
      usdPrice: price * event.price,
      currencyAddress: nullAddress,
      userAddress: _currentOwner,
      eventType,
    };
  } else if (eventType === 'ListedForReserveAuction') {
    const { _id, _reservePrice, _startDate } = decodedData;

    const price = _reservePrice.toString() / 1e18;

    return {
      collection,
      tokenId: _id,
      price,
      ethPrice: price,
      usdPrice: price * event.price,
      currencyAddress: nullAddress,
      userAddress: event.from_address,
      eventType,
    };
  } else if (eventType === 'ReserveAuctionConvertedToBuyItNow') {
    const { _id, _listingPrice, _startDate } = decodedData;

    const price = _listingPrice.toString() / 1e18;

    return {
      collection,
      tokenId: _id,
      price,
      ethPrice: price,
      usdPrice: price * event.price,
      currencyAddress: nullAddress,
      userAddress: event.from_address,
      eventType,
    };
  } else if (eventType === 'ReserveAuctionConvertedToOffers') {
    const { _editionId, _startDate } = decodedData;

    return {
      collection,
      tokenId: _editionId,
      eventType,
    };
  } else if (eventType === 'ReservePriceUpdated') {
    const { _id, _reservePrice } = decodedData;

    const price = _reservePrice.toString() / 1e18;

    return {
      collection,
      tokenId: _id,
      eventType,
      price,
      ethPrice: price,
      usdPrice: price * event.price,
      currencyAddress: nullAddress,
      userAddress: event.from_address,
    };
  }
};

module.exports = { abi, config, parse };
