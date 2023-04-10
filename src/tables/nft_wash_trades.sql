CREATE TABLE IF NOT EXISTS ethereum.nft_wash_trades (
    transaction_hash bytea,
    log_index numeric
);

CREATE INDEX IF NOT EXISTS nft_wash_trades_transaction_hash_log_index_idx ON ethereum.nft_wash_trades (transaction_hash, log_index);