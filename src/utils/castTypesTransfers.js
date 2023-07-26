const castTypes = (nftTransfers) => {
  return nftTransfers.map((nft) => ({
    transaction_hash: Buffer.from(nft.transaction_hash, 'hex'),
    log_index: Number(nft.log_index),
    topic_0: Buffer.from(nft.topic_0, 'hex'),
    block_time: new Date(nft.block_time),
    block_number: Number(nft.block_number),
    collection: Buffer.from(nft.collection.replace('0x', ''), 'hex'),
    token_id: Buffer.from(nft.tokenId.toString()),
    from_address: Buffer.from(nft.fromAddress.replace('0x', ''), 'hex'),
    to_address: Buffer.from(nft.toAddress.replace('0x', ''), 'hex'),
    amount: Number(nft.amount),
  }));
};

module.exports = castTypes;
