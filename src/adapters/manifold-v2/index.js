const { stripZerosLeft } = require('ethers');

const abi = require('./abi.json');
const config = require('./config.json');
const { nftTransferEvents, nullAddress } = require('../../utils/params');

const parse = (decodedData, event, events, interface, trace, traces) => {
  const eventType = config.events.find(
    (e) => e.signatureHash === `0x${event.topic_0}`
  )?.name;

  if (['PurchaseEvent', 'FinalizeListing'].includes(eventType)) {
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

    let seller;
    let buyer;
    let tokenId;
    let amount;
    let royaltyRecipient;
    let royaltyFeeEth;
    let royaltyFeeUsd;
    let salePrice;

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
      amount = BigInt(`0x${transferEventNFT.data.slice(64)}`);
    }

    if (seller === '0x') return {};

    if (eventType === 'PurchaseEvent') {
      const { amount } = decodedData;
      // price = in eth
      salePrice = amount.toString() / 1e18;
      if (salePrice === 1e-18) return {};
    } else if (eventType === 'FinalizeListing') {
      salePrice = trace.value.toString() / 1e18;
    }

    return {
      collection: transferEventNFT.contract_address,
      tokenId,
      amount: amount ?? 1,
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
    };
  } else if (eventType === 'CreateListingTokenDetails') {
    const { listingId, id, address_ } = decodedData;

    return {
      eventType,
      eventId: listingId,
      collection: address_,
      tokenId: id,
    };
  } else if (
    [
      'BidEvent',
      'OfferEvent',
      'RescindOfferEvent',
      'AcceptOfferEvent',
    ].includes(eventType)
  ) {
    const { listingId, bidder, oferrer, amount } = decodedData;

    const price = amount.toString() / 1e18;

    return {
      eventType,
      eventId: listingId,
      userAddress: bidder ?? oferrer,
      price,
      ethPrice: price,
      usdPrice: price * event.price,
    };
  } else if (eventType === 'ModifyListing') {
    const { listingId, initialAmount, endTime } = decodedData;

    const price = initialAmount.toString() / 1e18;

    return {
      eventType,
      eventId: listingId,
      expiration: endTime,
      price,
      ethPrice: price,
      usdPrice: price * event.price,
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
