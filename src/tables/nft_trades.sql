CREATE TABLE IF NOT EXISTS nft_trades (
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
    eth_sale_price numeric,
    usd_sale_price numeric,
    payment_token bytea,
    seller bytea,
    buyer bytea
);