const abi = require('./abi.json');
const config = require('./config.json');
const { nftTransferEvents, nullAddress } = require('../../utils/params');
const getEventType = require('../../utils/eventType');

const parse = (decodedData, event, events, interface, trace) => {
  const eventType = getEventType(config, event);

  if (eventType === 'PurchaseEvent') {
    // ignoring trades not paid in eth
    if (!trace?.value) return {};
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

    const { amount } = decodedData;
    // price = in eth
    const salePrice = amount.toString() / 1e18;
    // for mints and others (eg https://etherscan.io/tx/0xffc8d303733d30e15c4761c734996337b2e667b48bdf8c2739465e6ec54bc484)
    if (salePrice === 1e-18) return {};

    if (transferEventNFT.topic_0 === nftTransferEvents['erc721_Transfer']) {
      seller = transferEventNFT.topic_1.substring(24);
      buyer = transferEventNFT.topic_2.substring(24);
      tokenId = BigInt(`0x${transferEventNFT.topic_3}`);
    } else if (
      transferEventNFT.topic_0 === nftTransferEvents['erc1155_TransferSingle']
    ) {
      tokenId = BigInt(`0x${transferEventNFT.data.slice(0, 64)}`);
      seller = transferEventNFT.topic_2.substring(24);
      buyer = transferEventNFT.topic_3.substring(24);
    }
    if (seller === '0x') return {};

    let royaltyRecipient;
    let royaltyFeeEth;
    let royaltyFeeUsd;

    return {
      collection: transferEventNFT.contract_address,
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
  } else if (eventType === 'CreateListing') {
    const { listingId, endTime, initialAmount } = decodedData;

    const price = initialAmount.toString() / 1e18;
    return {
      eventId: listingId,
      price,
      ethPrice: price,
      usdPrice: price * event.price,
      expiration: endTime,
      currencyAddress: nullAddress,
      eventType,
      userAddress: event.from_address,
    };
  } else if (eventType === 'CreateListingTokenDetails') {
    const { listingId, id, address_ } = decodedData;

    return {
      eventType,
      eventId: listingId,
      collection: address_,
      tokenId: id,
      userAddress: event.from_address,
    };
  } else if (eventType === 'BidEvent') {
    const { listingId, bidder, amount } = decodedData;

    const price = amount.toString() / 1e18;
    return {
      eventId: listingId,
      price,
      ethPrice: price,
      usdPrice: price * event.price,
      userAddress: bidder,
      currencyAddress: nullAddress,
      eventType,
    };
  } else if (eventType === 'CancelListing') {
    const { listingId, requestor } = decodedData;

    return {
      eventType,
      eventId: listingId,
      userAddress: requestor,
    };
  }
};

module.exports = { abi, config, parse };
