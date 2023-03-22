const abi = require('./abi.json');
const config = require('./config.json');

const parse = async (decodedData, event, _, __, events) => {
  // find the corresponding transfer event which contains collection and tokenId info
  const transferEvent = events.find(
    (e) =>
      e.transaction_hash === event.transaction_hash &&
      e.log_index === event.log_index - 1
  );

  if (!transferEvent?.contract_address) return {};

  const tokenId =
    transferEvent.topic_0 ===
    'ddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef' // erc721 Transfer: tokenId = topic3
      ? BigInt(`0x${transferEvent.topic_3}`)
      : transferEvent.topic_0 ===
        'c3d58168c5ae7397731d063d5bbf3d657854427343f4c083240f7aacaa2d0f62' // erc1155 TransferSingle: tokenId in data field
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
