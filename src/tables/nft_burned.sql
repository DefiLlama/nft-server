CREATE TABLE IF NOT EXISTS ethereum.nft_burned (
    collection bytea,
    token_id bytea,
    transaction_hash bytea,
    block_time timestamp,
    block_number numeric,
    log_index numeric,
    from_address bytea,
    PRIMARY KEY (collection, token_id)
);

CREATE INDEX IF NOT EXISTS ethereum_nft_burned_collection_idx ON ethereum.nft_burned (collection);

CREATE INDEX IF NOT EXISTS ethereum_nft_burned_token_id_idx ON ethereum.nft_burned (token_id);