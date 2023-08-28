const { stripZerosLeft } = require('ethers');

const abi = require('./abi.json');
const config = require('./config.json');
const { nftTransferEvents, nullAddress } = require('../../utils/params');
const getEventType = require('../../utils/eventType');

const parse = (decodedData, event, events) => {
  const eventType = getEventType(config, event);

  if (
    ['BuyPriceAccepted', 'OfferAccepted', 'ReserveAuctionFinalized'].includes(
      eventType
    )
  ) {
    let collection;
    let tokenId;
    let buyer;

    if (eventType === 'ReserveAuctionFinalized') {
      const transfersNFT = events.filter(
        (e) => e.transaction_hash === event.transaction_hash
      );

      if (!transfersNFT.length) return {};

      let transferEventNFT =
        transfersNFT?.length === 1
          ? transfersNFT[0]
          : transfersNFT.find(
              (tf) =>
                tf.topic_1.includes(event.from_address) ||
                tf.topic_2.includes(event.from_address) ||
                tf.topic_3.includes(event.from_address)
            );

      if (!transferEventNFT) return {};

      collection = stripZerosLeft(`0x${transferEventNFT.contract_address}`);

      if (transferEventNFT.topic_0 === nftTransferEvents['erc721_Transfer']) {
        tokenId = BigInt(`0x${transferEventNFT.topic_3}`);
      } else if (
        transferEventNFT.topic_0 === nftTransferEvents['erc1155_TransferSingle']
      ) {
        tokenId = BigInt(`0x${transferEventNFT.data.slice(0, 64)}`);
      }
    }

    const {
      seller,
      nftContract,
      tokenId: token,
      buyer: buyerAddress,
      bidder,
      creatorRev,
      sellerRev,
      totalFees,
    } = decodedData;

    tokenId = eventType === 'ReserveAuctionFinalized' ? tokenId : token;
    collection =
      eventType === 'ReserveAuctionFinalized' ? collection : nftContract;
    buyer = eventType === 'ReserveAuctionFinalized' ? bidder : buyerAddress;

    const salePrice = (creatorRev + sellerRev + totalFees).toString() / 1e18;

    let royaltyRecipient;
    let royaltyFeeEth;
    let royaltyFeeUsd;

    if (creatorRev > 0 && sellerRev > 0) {
      royaltyFeeEth = creatorRev.toString() / 1e18;
      royaltyFeeUsd = royaltyFeeEth * event.price;
    }
    return {
      collection,
      tokenId,
      amount: 1,
      salePrice,
      ethSalePrice: salePrice,
      usdSalePrice: salePrice * event.price,
      paymentToken: nullAddress,
      seller,
      buyer,
      royaltyRecipient,
      royaltyFeeEth,
      royaltyFeeUsd,
    };
  } else if (eventType === 'BuyPriceSet') {
    const { nftContract, tokenId, seller, price: _price } = decodedData;

    const price = _price.toString() / 1e18;

    return {
      collection: nftContract,
      tokenId,
      price,
      ethPrice: price,
      usdPrice: price * event.price,
      currencyAddress: nullAddress,
      userAddress: seller,
      eventType,
    };
  } else if (
    ['BuyPriceCanceled', 'BuyPriceInvalidated', 'OfferInvalidated'].includes(
      eventType
    )
  ) {
    const { nftContract, tokenId } = decodedData;

    return {
      collection: nftContract,
      tokenId,
      eventType,
    };
  } else if (eventType === 'OfferMade') {
    const { nftContract, tokenId, buyer, amount, expiration } = decodedData;

    const price = amount.toString() / 1e18;

    return {
      collection: nftContract,
      tokenId,
      price,
      ethPrice: price,
      usdPrice: price * event.price,
      currencyAddress: nullAddress,
      userAddress: buyer,
      eventType,
      expiration,
    };
  } else if (eventType === 'ReserveAuctionBidPlaced') {
    const { auctionId, bidder, amount, endTime } = decodedData;

    const price = amount.toString() / 1e18;

    return {
      eventId: auctionId,
      userAddress: bidder,
      price,
      ethPrice: price,
      usdPrice: price * event.price,
      currencyAddress: nullAddress,
      eventType,
      expiration: endTime,
    };
  } else if (
    ['ReserveAuctionCanceled', 'ReserveAuctionInvalidated'].includes(eventType)
  ) {
    const { auctionId } = decodedData;

    return {
      eventId: auctionId,
      eventType,
    };
  } else if (eventType === 'ReserveAuctionCreated') {
    const { seller, nftContract, tokenId, duration, reservePrice, auctionId } =
      decodedData;

    const price = reservePrice.toString() / 1e18;

    return {
      eventId: auctionId,
      userAddress: seller,
      collection: nftContract,
      tokenId,
      price,
      ethPrice: price,
      usdPrice: price * event.price,
      currencyAddress: nullAddress,
      eventType,
      duration,
    };
  } else if (eventType === 'ReserveAuctionUpdated') {
    const { auctionId, reservePrice } = decodedData;

    const price = reservePrice.toString() / 1e18;

    return {
      eventId: auctionId,
      eventType,
      price,
      ethPrice: price,
      usdPrice: price * event.price,
      currencyAddress: nullAddress,
    };
  }
};

module.exports = { abi, config, parse };
