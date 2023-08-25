const { stripZerosLeft } = require('ethers');

const abi = require('./abi.json');
const config = require('./config.json');
const { nftTransferEvents } = require('../../utils/params');

const paymentToken = '0000000000000000000000000000000000000000';

const parse = (decodedData, event, events) => {
  const eventType = config.events.find(
    (e) => e.signatureHash === `0x${event.topic_0}`
  )?.name;

  if (eventType === 'acceptBidPH') {
    const tokenId = BigInt(`0x${event.data.slice(0, 64)}`);
    const collection = stripZerosLeft(`0x${event.data.slice(64, 128)}`);
    const price = BigInt(`0x${event.data.slice(192, 256)}`);
    const buyer = stripZerosLeft(`0x${event.data.slice(256, 320)}`);
    const seller = stripZerosLeft(`0x${event.data.slice(320, 384)}`);

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
    const collection = stripZerosLeft(`0x${event.data.slice(64, 128)}`);
    const price = BigInt(`0x${event.data.slice(128, 192)}`);
    const buyer = stripZerosLeft(`0x${event.data.slice(192, 256)}`);
    const seller = stripZerosLeft(`0x${event.data.slice(256, 320)}`);

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
  }

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
};

module.exports = { abi, config, parse };
