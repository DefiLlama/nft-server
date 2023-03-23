const { stripZerosLeft } = require('ethers');

const abi = require('./abi.json');
const config = require('./config.json');
const { nftTransferEvents } = require('../../utils/params');

const parse = (decodedData, event, events) => {
  // remove potential lazy mint and match on transaction_hash
  const transfers = events.filter(
    (e) =>
      e.topic_1 !==
        '0000000000000000000000000000000000000000000000000000000000000000' &&
      e.transaction_hash === event.transaction_hash
  );

  // find the first transfer event which has the from address in either topic_1 - topic_3
  // so we catch both cases of erc721 transfer and erc1155 TransferSingle
  const transferEvent = transfers.find(
    (tf) =>
      tf.topic_1.includes(event.from_address) ||
      tf.topic_2.includes(event.from_address) ||
      tf.topic_3.includes(event.from_address)
  );

  if (!transferEvent) return {};

  let tokenId;
  let buyer;
  let seller;
  if (transferEvent.topic_0 === nftTransferEvents['erc721_Transfer']) {
    seller = stripZerosLeft(`0x${transferEvent.topic_1}`);
    buyer = stripZerosLeft(`0x${transferEvent.topic_2}`);
    tokenId = BigInt(`0x${transferEvent.topic_3}`);
  } else if (
    transferEvent.topic_0 === nftTransferEvents['erc1155_TransferSingle']
  ) {
    tokenId = BigInt(`0x${transferEvent.data.slice(0, 64)}`);
    seller = stripZerosLeft(`0x${transferEvent.topic_2}`);
    buyer = stripZerosLeft(`0x${transferEvent.topic_3}`);
  }

  const { newLeftFill } = decodedData;

  const salePrice = newLeftFill.toString() / 1e18;

  return {
    collection: transferEvent.contract_address,
    tokenId,
    amount: 1,
    salePrice,
    ethSalePrice: salePrice,
    usdSalePrice: salePrice * event.price,
    paymentToken: '0x0000000000000000000000000000000000000000',
    seller,
    buyer,
  };
};

module.exports = { abi, config, parse };
