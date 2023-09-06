CREATE TABLE IF NOT EXISTS ethereum.nft_transfers (
    transaction_hash bytea,
    log_index numeric,
    topic_0 bytea,
    block_time timestamp,
    block_number numeric,
    collection bytea,
    token_id bytea,
    from_address bytea,
    to_address bytea,
    amount numeric
);

CREATE INDEX IF NOT EXISTS ethereum_nft_transfers_block_number_idx ON ethereum.nft_transfers (block_number);

CREATE INDEX IF NOT EXISTS ethereum_nft_transfers_collection_idx ON ethereum.nft_transfers (collection);

CREATE INDEX CONCURRENTLY IF NOT EXISTS ethereum_nft_transfers_token_id_idx ON ethereum.nft_transfers (token_id);

CREATE INDEX CONCURRENTLY IF NOT EXISTS ethereum_nft_transfers_to_address_idx ON ethereum.nft_transfers (to_address);

CREATE INDEX CONCURRENTLY IF NOT EXISTS ethereum_nft_transfers_from_address_idx ON ethereum.nft_transfers (from_address);