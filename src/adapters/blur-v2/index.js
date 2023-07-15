const { stripZerosLeft } = require('ethers');

const abi = require('./abi.json');
const config = require('./config.json');
const { nftTransferEvents } = require('../../utils/params');

const parse = (decodedData, event, events) => {
  const { transfer, price } = decodedData;

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

  if (
    `0x${event.topic_0}` ===
    config.events.find((e) => e.name === 'Execution').signatureHash
  ) {
    const { trader, id, collection: collectionAddress } = transfer;
    seller = trader;
    tokenId = id;
    salePrice = price.toString() / 1e18;
    ethSalePrice = salePrice;
    usdSalePrice = ethSalePrice * event.price;
    collection = collectionAddress;
    amount = 1;
    buyer = stripZerosLeft(`0x${transferEventNFT.topic_2}`);
  } else return {};

  return {
    collection,
    tokenId,
    amount,
    salePrice,
    ethSalePrice,
    usdSalePrice,
    paymentToken: '0000000000000000000000000000000000000000',
    seller,
    buyer,
    royaltyRecipient,
    royaltyFeeEth,
    royaltyFeeUsd,
  };
};

module.exports = { abi, config, parse };
