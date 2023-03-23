const abi = require('./abi.json');
const config = require('./config.json');
const { nftTransferEvents } = require('../../utils/params');

const parse = async (decodedData, event, _, events) => {
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
  if (transferEvent.topic_0 === nftTransferEvents['erc721_Transfer']) {
    tokenId = BigInt(`0x${transferEvent.topic_3}`);
  } else if (
    transferEvent.topic_0 === nftTransferEvents['erc1155_TransferSingle']
  ) {
    tokenId = BigInt(`0x${transferEvent.data.slice(0, 64)}`);
  }

  const { maker, taker, price } = decodedData;

  const salePrice = price.toString() / 1e18;

  return {
    collection: transferEvent.contract_address,
    tokenId,
    amount: 1,
    salePrice,
    ethSalePrice: salePrice,
    usdSalePrice: salePrice * event.price,
    paymentToken: '0x0000000000000000000000000000000000000000',
    seller: maker,
    buyer: taker,
  };
};

module.exports = {
  abi,
  config,
  parse,
};
