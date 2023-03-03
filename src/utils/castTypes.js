// format into required nft_trades schema
// strings -> buffer
const castTypes = (nftTrades) => {
  return nftTrades.map((nft) => ({
    transaction_hash: Buffer.from(nft.transaction_hash),
    log_index: Number(nft.log_index),
    contract_address: Buffer.from(nft.contract_address),
    topic_0: Buffer.from(nft.topic_0),
    block_time: new Date(nft.block_time),
    block_number: Number(nft.block_number),
    exchange_name: Buffer.from(nft.exchangeName),
    collection: Buffer.from(nft.collection.replace('0x', '')),
    token_id: Buffer.from(nft.tokenId),
    amount: Number(nft.amount),
    eth_sale_price: Number(nft.ethSalePrice),
    usd_sale_price: Number(nft.usdSalePrice.toFixed(5)),
    payment_token: Buffer.from(nft.paymentToken.replace('0x', '')),
    seller: Buffer.from(nft.seller.replace('0x', '')),
    buyer: Buffer.from(nft.buyer.replace('0x', '')),
  }));
};

module.exports = castTypes;
