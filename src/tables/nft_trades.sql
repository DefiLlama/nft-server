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
    buyer bytea
);

CREATE INDEX IF NOT EXISTS ethereum_nft_trades_block_number_idx ON ethereum.nft_trades (block_number);

CREATE INDEX IF NOT EXISTS ethereum_nft_trades_collection_idx ON ethereum.nft_trades (collection);