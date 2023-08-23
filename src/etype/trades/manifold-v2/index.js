const { stripZerosLeft } = require('ethers');

const abi = require('./abi.json');
const config = require('./config.json');
const { nftTransferEvents } = require('../../../utils/params');

const parse = (decodedData, event, events, interface, trace, traces) => {
  // ignoring trades not paid in eth
  if (!trace.value) return {};
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

  const eventType = config.events.find(
    (e) => e.signatureHash === `0x${event.topic_0}`
  )?.name;

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
    paymentToken: '0x0000000000000000000000000000000000000000',
    seller,
    buyer,
    royaltyRecipient,
    royaltyFeeEth,
    royaltyFeeUsd,
  };
};

module.exports = { abi, config, parse };
