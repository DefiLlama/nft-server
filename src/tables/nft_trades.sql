CREATE TABLE IF NOT EXISTS ethereum.nft_trades (
    transaction_hash bytea,
    log_index numeric,
    contract_address bytea,
    topic_0 bytea,
    block_time timestamp,
    block_number numeric,
    exchange_name bytea,
    collection bytea,
    token_id bytea,
    amount numeric,
    sale_price numeric,
    eth_sale_price numeric,
    usd_sale_price numeric,
    payment_token bytea,
    seller bytea,
    buyer bytea,
    aggregator_name bytea,
    aggregator_address bytea,
    royalty_recipient bytea,
    royalty_fee_eth numeric,
    royalty_fee_usd numeric
);

CREATE INDEX IF NOT EXISTS ethereum_nft_trades_block_number_idx ON ethereum.nft_trades (block_number);

CREATE INDEX IF NOT EXISTS ethereum_nft_trades_collection_idx ON ethereum.nft_trades (collection);

CREATE INDEX CONCURRENTLY IF NOT EXISTS ethereum_nft_trades_token_id_idx ON ethereum.nft_trades (token_id);

-- testing
CREATE INDEX IF NOT EXISTS ethereum_nft_trades_seller_buyer_token_id_transaction_hash ON ethereum.nft_trades (seller, buyer, token_id, transaction_hash);