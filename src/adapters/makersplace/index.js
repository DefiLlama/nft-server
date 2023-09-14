const abi = require('./abi.json');
const config = require('./config.json');
const { nftTransferEvents, nullAddress } = require('../../utils/params');
const getEventType = require('../../utils/eventType');

const paymentToken = nullAddress;

const parse = (decodedData, event, events) => {
  const eventType = getEventType(config, event);

  if (eventType === 'acceptBidPH') {
    const tokenId = BigInt(`0x${event.data.slice(0, 64)}`);
    const collection = event.data.slice(64, 128).substring(24);
    const buyer = event.data.slice(256, 320).substring(24);
    const seller = event.data.slice(320, 384).substring(24);
    const price = BigInt(`0x${event.data.slice(384, 448)}`);

    // note, there are events (with the same topic_0) which dont' seem to be sales
    // https://etherscan.io/tx/0x3d31ecfd6e9fe71a6922b1e80113f5132351392346526b7495b33c29d7b2766e
    // defined by empty seller and empty price
    if (seller === nullAddress.replace('0x', '')) return {};

    const salePrice = price.toString() / 1e18;

    return {
      collection,
      tokenId,
      amount: 1,
      salePrice,
      ethSalePrice: salePrice,
      usdSalePrice: salePrice * event.price,
      paymentToken,
      seller,
      buyer,
    };
  } else if (eventType === 'purchasePH') {
    const tokenId = BigInt(`0x${event.data.slice(0, 64)}`);
    const collection = event.data.slice(64, 128).substring(24);
    const price = BigInt(`0x${event.data.slice(128, 192)}`);
    const buyer = event.data.slice(192, 256).substring(24);
    const seller = event.data.slice(256, 320).substring(24);

    const salePrice = price.toString() / 1e18;

    return {
      collection,
      tokenId,
      amount: 1,
      salePrice,
      ethSalePrice: salePrice,
      usdSalePrice: salePrice * event.price,
      paymentToken,
      seller,
      buyer,
    };
  } else if (
    ['OBOSaleEvent', 'SaleSuccessfulEvent', 'TokenBidAccepted'].includes(
      eventType
    )
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

    let tokenId;
    let buyer;
    let seller;
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
    const { priceInWei, payoutAmount } = decodedData;

    // price = in eth
    const sPrice = priceInWei ?? payoutAmount;
    const salePrice = sPrice.toString() / 1e18;
    let royaltyFeeEth;
    let royaltyFeeUsd;
    let royaltyRecipient;
    const amount = 1;
    const collection = transferEventNFT.contract_address;

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
  } else if (eventType === 'SaleCanceledEvent') {
    const { tokenId, tokenContractAddress } = decodedData;

    return {
      tokenId,
      collection: tokenContractAddress,
      userAddress: event.from_address,
      eventType,
    };
  } else if (eventType === 'SaleCreatedEvent') {
    const { tokenId, tokenContractAddress, priceInWei } = decodedData;

    const price = priceInWei.toString() / 1e18;

    return {
      tokenId,
      collection: tokenContractAddress,
      price,
      ethPrice: price,
      usdPrice: price * event.price,
      currencyAddress: nullAddress,
      userAddress: event.from_address,
      eventType,
    };
  } else if (eventType === 'TokenBidCreatedEvent') {
    const { tokenId, tokenAddress, bidId, bidPrice, bidder } = decodedData;

    const price = bidPrice.toString() / 1e18;

    return {
      tokenId,
      collection: tokenAddress,
      eventId: bidId,
      price,
      ethPrice: price,
      usdPrice: price * event.price,
      currencyAddress: nullAddress,
      userAddress: bidder,
      eventType,
    };
  } else if (eventType === 'TokenBidRemovedEvent') {
    const { tokenId, tokenAddress, bidId } = decodedData;

    return {
      tokenId,
      collection: tokenAddress,
      eventId: bidId,
      eventType,
      userAddress: event.from_address,
    };
  } else if (eventType === 'BidPH') {
    const tokenId = BigInt(`0x${event.data.slice(0, 64)}`);
    const collection = event.data.slice(64, 128).substring(24);
    const amount = BigInt(`0x${event.data.slice(128, 192)}`);

    const price = amount.toString() / 1e18;

    return {
      collection,
      tokenId,
      price,
      ethPrice: price,
      usdPrice: price * event.price,
      userAddress: event.from_address,
      eventType,
    };
  }
};

module.exports = { abi, config, parse };
