const abi = require('./abi.json');
const config = require('./config.json');
const { nftTransferEvents } = require('../../utils/params');

const parse = async (decodedData, event, _, events) => {
  // find the corresponding transfer event which contains collection and tokenId info
  const transferEvent = events.find(
    (e) =>
      e.transaction_hash === event.transaction_hash &&
      e.log_index === event.log_index - 1
  );

  if (!transferEvent?.contract_address) return {};

  const tokenId =
    transferEvent.topic_0 === nftTransferEvents['erc721_Transfer']
      ? BigInt(`0x${transferEvent.topic_3}`)
      : transferEvent.topic_0 === nftTransferEvents['erc1155_TransferSingle']
      ? BigInt(`0x${transferEvent.data.slice(0, 64)}`)
      : undefined;

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
