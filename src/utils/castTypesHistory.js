const castTypes = (nftHistory) => {
  return nftHistory.map((nft) => ({
    transaction_hash: Buffer.from(nft.transaction_hash, 'hex'),
    log_index: Number(nft.log_index),
    contract_address: Buffer.from(nft.contract_address, 'hex'),
    topic_0: Buffer.from(nft.topic_0, 'hex'),
    block_time: new Date(nft.block_time),
    block_number: Number(nft.block_number),
    exchange_name: Buffer.from(nft.exchangeName),
    event_type: Buffer.from(nft.eventType),
    collection: nft.collection
      ? Buffer.from(nft.collection.replace('0x', ''), 'hex')
      : null,
    token_id: nft.tokenId ? Buffer.from(nft.tokenId.toString()) : null,
    price: Number.isFinite(nft.price) ? Number(nft.price) : null,
    eth_price: Number.isFinite(nft.ethPrice) ? Number(nft.ethPrice) : null,
    usd_price: Number.isFinite(nft.usdPrice)
      ? Number(nft.usdPrice.toFixed(5))
      : null,
    currency_address: nft.currencyAddress
      ? Buffer.from(nft.currencyAddress.replace('0x', ''), 'hex')
      : null,
    user_address: nft.userAddress
      ? Buffer.from(nft.userAddress.replace('0x', ''), 'hex')
      : null,
    event_id: nft.eventId ? Buffer.from(nft.eventId.toString()) : null,
    expiration: nft.expiration ? Number(nft.expiration) : null,
  }));
};

module.exports = castTypes;
