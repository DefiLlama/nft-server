const castTypes = (nftTrades) => {
  return nftTrades.map((nft) => ({
    transaction_hash: Buffer.from(nft.transaction_hash, 'hex'),
    log_index: Number(nft.log_index),
    contract_address: Buffer.from(nft.contract_address, 'hex'),
    topic_0: Buffer.from(nft.topic_0, 'hex'),
    block_time: new Date(nft.block_time),
    block_number: Number(nft.block_number),
    exchange_name: Buffer.from(nft.exchangeName),
    collection: nft.collection
      ? Buffer.from(nft.collection.replace('0x', ''), 'hex')
      : null,
    token_id: nft.tokenId?.toString()
      ? Buffer.from(nft.tokenId.toString())
      : null,
    amount: nft.amount ? Number(nft.amount) : null,
    sale_price: Number.isFinite(nft.salePrice) ? Number(nft.salePrice) : null,
    eth_sale_price: Number.isFinite(nft.ethSalePrice)
      ? Number(nft.ethSalePrice)
      : null,
    usd_sale_price: Number.isFinite(nft.usdSalePrice)
      ? Number(nft.usdSalePrice.toFixed(5))
      : null,
    payment_token: nft.paymentToken
      ? Buffer.from(nft.paymentToken.replace('0x', ''), 'hex')
      : null,
    seller: nft.seller
      ? Buffer.from(nft.seller.replace('0x', ''), 'hex')
      : null,
    buyer: nft.buyer ? Buffer.from(nft.buyer.replace('0x', ''), 'hex') : null,
    aggregator_name: nft.aggregatorName
      ? Buffer.from(nft.aggregatorName)
      : null,
    aggregator_address: nft.aggregatorAddress
      ? Buffer.from(nft.aggregatorAddress.replace('0x', ''), 'hex')
      : null,
    royalty_recipient: nft.royaltyRecipient
      ? Buffer.from(nft.royaltyRecipient.replace('0x', ''), 'hex')
      : null,
    royalty_fee_eth: Number.isFinite(nft.royaltyFeeEth)
      ? Number(nft.royaltyFeeEth.toFixed(10))
      : null,
    royalty_fee_usd: Number.isFinite(nft.royaltyFeeUsd)
      ? Number(nft.royaltyFeeUsd.toFixed(5))
      : null,
  }));
};

module.exports = castTypes;
