const { stripZerosLeft } = require('ethers');

const abi = require('./abi.json');
const config = require('./config.json');
const { nftTransferEvents } = require('../../utils/params');

const unpackTokenIdListingIndexTrader = (packedValue) => {
  /*
 function packTokenIdListingIndexTrader(
        uint256 tokenId,
        uint256 listingIndex,
        address trader
    ) private pure returns (uint256) {
        return (tokenId << (21 * 8)) | (listingIndex << (20 * 8)) | uint160(trader);
    }
*/

  let trader = packedValue % BigInt(2) ** BigInt(160);
  packedValue /= BigInt(2) ** BigInt(160);

  let listingIndex = packedValue % BigInt(2) ** BigInt(8);
  packedValue /= BigInt(2) ** BigInt(8);

  let tokenId = packedValue;

  return [tokenId, listingIndex, trader.toString(16)];
};

const unpackTypePriceCollection = (packedValue) => {
  /*
  function packTypePriceCollection(
      OrderType orderType,
      uint256 price,
      address collection
  ) private pure returns (uint256) {
      return (uint256(orderType) << (31 * 8)) | (price << (20 * 8)) | uint160(collection);
  }
*/

  let collection = packedValue % BigInt(2) ** BigInt(160);
  packedValue /= BigInt(2) ** BigInt(160);

  let price = packedValue % BigInt(2) ** BigInt(88);
  packedValue /= BigInt(2) ** BigInt(88);

  let orderType = packedValue;

  return [orderType, price, collection.toString(16)];
};

const unpackFee = (packedValue) => {
  /*
  function packFee(FeeRate memory fee) private pure returns (uint256) {
    return (uint256(fee.rate) << (20 * 8)) | uint160(fee.recipient);
  }
  */

  let recipient = packedValue % BigInt(2) ** BigInt(160);
  packedValue /= BigInt(2) ** BigInt(160);

  let rate = packedValue;

  return [rate, recipient.toString(16)];
};

const parse = (decodedData, event, events) => {
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

  let collection;
  let tokenId;
  let amount;
  let salePrice;
  let ethSalePrice;
  let usdSalePrice;
  let seller;
  let buyer;
  let royaltyRecipient;
  let royaltyFeeEth;
  let royaltyFeeUsd;
  const paymentToken = '0000000000000000000000000000000000000000';

  if (
    `0x${event.topic_0}` ===
    config.events.find((e) => e.name === 'Execution').signatureHash
  ) {
    const {
      transfer: { trader, id, collection: collectionAddress },
      price,
      fees: {
        takerFee: { recipient, rate },
      },
      orderType,
    } = decodedData;

    seller =
      orderType === 0n
        ? trader
        : stripZerosLeft(`0x${transferEventNFT.topic_1}`);
    buyer =
      orderType === 0n
        ? stripZerosLeft(`0x${transferEventNFT.topic_2}`)
        : trader;

    tokenId = id;
    salePrice = price.toString() / 1e18;
    ethSalePrice = salePrice;
    usdSalePrice = ethSalePrice * event.price;
    collection = collectionAddress;
    amount = 1;

    if (rate > 0) {
      royaltyFeeEth = ethSalePrice * (rate.toString() / 1e4);
      royaltyFeeUsd = royaltyFeeEth * event.price;
      royaltyRecipient = recipient;
    }
  } else {
    const {
      tokenIdListingIndexTrader,
      collectionPriceSide,
      takerFeeRecipientRate,
      makerFeeRecipientRate,
    } = decodedData;

    const [nftTokenId, listingIndex, trader] = unpackTokenIdListingIndexTrader(
      tokenIdListingIndexTrader
    );

    const [orderType, price, collectionAddress] =
      unpackTypePriceCollection(collectionPriceSide);

    tokenId = nftTokenId;
    collection = collectionAddress;
    salePrice = ethSalePrice = price.toString() / 1e18;
    usdSalePrice = ethSalePrice * event.price;
    amount = 1;
    seller =
      orderType === 0n
        ? trader
        : stripZerosLeft(`0x${transferEventNFT.topic_1}`);
    buyer =
      orderType === 0n
        ? stripZerosLeft(`0x${transferEventNFT.topic_2}`)
        : trader;

    if (takerFeeRecipientRate || makerFeeRecipientRate) {
      const [rate, recipient] =
        takerFeeRecipientRate !== undefined
          ? unpackFee(takerFeeRecipientRate)
          : unpackFee(makerFeeRecipientRate);

      royaltyFeeEth = ethSalePrice * (rate.toString() / 1e4);
      royaltyFeeUsd = royaltyFeeEth * event.price;
      royaltyRecipient = recipient;
    }
  }

  return {
    collection,
    tokenId,
    amount,
    salePrice,
    ethSalePrice,
    usdSalePrice,
    paymentToken,
    seller,
    buyer,
    royaltyRecipient,
    royaltyFeeEth,
    royaltyFeeUsd,
  };
};

module.exports = { abi, config, parse };
