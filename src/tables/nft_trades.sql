-- create table ethereum.nft_trades
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
    amount number,
    eth_sale_price number,
    usd_sale_price number,
    payment_token bytea,
    seller bytea,
    buyer bytea
);