const { stripZerosLeft } = require('ethers');

const abi = require('./abi.json');
const config = require('./config.json');
const { nftTransferEvents } = require('../../utils/params');

const parse = (decodedData, event, events) => {
  let collection;
  let tokenId;
  let buyer;

  // transfer events are only required for ReserveAuctionFinalized event
  let transferEventNFT;
  const ReserveAuctionFinalizedSigHash = config.events
    .find((e) => e.name === 'ReserveAuctionFinalized')
    .signatureHash.replace('0x', '');

  if (event.topic_0 === ReserveAuctionFinalizedSigHash) {
    const transfersNFT = events.filter(
      (e) => e.transaction_hash === event.transaction_hash
    );

    if (!transfersNFT.length) return {};

    transferEventNFT =
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

  tokenId = event.topic_0 === ReserveAuctionFinalizedSigHash ? tokenId : token;
  collection =
    event.topic_0 === ReserveAuctionFinalizedSigHash ? collection : nftContract;
  buyer =
    event.topic_0 === ReserveAuctionFinalizedSigHash ? bidder : buyerAddress;

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
    paymentToken: '0x0000000000000000000000000000000000000000',
    seller,
    buyer,
    royaltyRecipient,
    royaltyFeeEth,
    royaltyFeeUsd,
  };
};

module.exports = { abi, config, parse };
