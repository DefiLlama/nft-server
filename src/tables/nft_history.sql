CREATE TABLE IF NOT EXISTS ethereum.nft_history (
    transaction_hash bytea,
    log_index numeric,
    contract_address bytea,
    topic_0 bytea,
    block_time timestamp,
    block_number numeric,
    exchange_name bytea,
    collection bytea,
    token_id bytea,
    price numeric,
    eth_price numeric,
    usd_price numeric,
    currency_address bytea,
    event_type bytea,
    user_address bytea,
    event_id bytea
);

CREATE INDEX IF NOT EXISTS ethereum_nft_history_block_number_idx ON ethereum.nft_history (block_number);

CREATE INDEX IF NOT EXISTS ethereum_nft_history_collection_idx ON ethereum.nft_history (collection);