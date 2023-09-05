const castTypesTrades = (e) => {
  return {
    transaction_hash: Buffer.from(e.transaction_hash, 'hex'),
    log_index: Number(e.log_index),
    contract_address: Buffer.from(e.contract_address, 'hex'),
    topic_0: Buffer.from(e.topic_0, 'hex'),
    block_time: new Date(e.block_time),
    block_number: Number(e.block_number),
    exchange_name: Buffer.from(e.exchangeName),
    collection: e.collection
      ? Buffer.from(e.collection.replace('0x', ''), 'hex')
      : null,
    token_id: e.tokenId?.toString() ? Buffer.from(e.tokenId.toString()) : null,
    amount: e.amount ? Number(e.amount) : null,
    sale_price: Number.isFinite(e.salePrice) ? Number(e.salePrice) : null,
    eth_sale_price: Number.isFinite(e.ethSalePrice)
      ? Number(e.ethSalePrice)
      : null,
    usd_sale_price: Number.isFinite(e.usdSalePrice)
      ? Number(e.usdSalePrice.toFixed(5))
      : null,
    payment_token: e.paymentToken
      ? Buffer.from(e.paymentToken.replace('0x', ''), 'hex')
      : null,
    seller: e.seller ? Buffer.from(e.seller.replace('0x', ''), 'hex') : null,
    buyer: e.buyer ? Buffer.from(e.buyer.replace('0x', ''), 'hex') : null,
    aggregator_name: e.aggregatorName ? Buffer.from(e.aggregatorName) : null,
    aggregator_address: e.aggregatorAddress
      ? Buffer.from(e.aggregatorAddress.replace('0x', ''), 'hex')
      : null,
    royalty_recipient: e.royaltyRecipient
      ? Buffer.from(e.royaltyRecipient.replace('0x', ''), 'hex')
      : null,
    royalty_fee_eth: Number.isFinite(e.royaltyFeeEth)
      ? Number(e.royaltyFeeEth.toFixed(10))
      : null,
    royalty_fee_usd: Number.isFinite(e.royaltyFeeUsd)
      ? Number(e.royaltyFeeUsd.toFixed(5))
      : null,
  };
};

const castTypesHistory = (e) => {
  return {
    transaction_hash: Buffer.from(e.transaction_hash, 'hex'),
    log_index: Number(e.log_index),
    contract_address: Buffer.from(e.contract_address, 'hex'),
    topic_0: Buffer.from(e.topic_0, 'hex'),
    block_time: new Date(e.block_time),
    block_number: Number(e.block_number),
    exchange_name: Buffer.from(e.exchangeName),
    event_type: Buffer.from(e.eventType),
    collection: e.collection
      ? Buffer.from(e.collection.replace('0x', ''), 'hex')
      : null,
    token_id: e.tokenId?.toString() ? Buffer.from(e.tokenId.toString()) : null,
    price: Number.isFinite(e.price) ? Number(e.price) : null,
    eth_price: Number.isFinite(e.ethPrice) ? Number(e.ethPrice) : null,
    usd_price: Number.isFinite(e.usdPrice)
      ? Number(e.usdPrice.toFixed(5))
      : null,
    currency_address: e.currencyAddress
      ? Buffer.from(e.currencyAddress.replace('0x', ''), 'hex')
      : null,
    user_address: e.userAddress
      ? Buffer.from(e.userAddress.replace('0x', ''), 'hex')
      : null,
    event_id: e.eventId?.toString() ? Buffer.from(e.eventId.toString()) : null,
    expiration: e.expiration?.toString() ? Number(e.expiration) : null,
  };
};

const castTypesTransfers = (e) => {
  return {
    transaction_hash: Buffer.from(e.transaction_hash, 'hex'),
    log_index: Number(e.log_index),
    topic_0: Buffer.from(e.topic_0, 'hex'),
    block_time: new Date(e.block_time),
    block_number: Number(e.block_number),
    collection: Buffer.from(e.collection.replace('0x', ''), 'hex'),
    token_id: Buffer.from(e.tokenId.toString()),
    from_address: Buffer.from(e.fromAddress.replace('0x', ''), 'hex'),
    to_address: Buffer.from(e.toAddress.replace('0x', ''), 'hex'),
    amount: Number(e.amount),
  };
};

const castTypesCreator = (e) => {
  return {
    collection: Buffer.from(e.collection.replace('0x', ''), 'hex'),
    token_id: Buffer.from(e.tokenId.toString()),
    creator: Buffer.from(e.creator.replace('0x', ''), 'hex'),
  };
};

module.exports = {
  castTypesTrades,
  castTypesHistory,
  castTypesTransfers,
  castTypesCreator,
};
