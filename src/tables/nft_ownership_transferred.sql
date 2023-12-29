CREATE TABLE IF NOT EXISTS ethereum.nft_ownership_transferred (
    transaction_hash bytea,
    log_index numeric,
    block_time timestamp,
    block_number numeric,
    collection bytea,
    new_owner bytea
);

CREATE INDEX IF NOT EXISTS ethereum_nft_ownership_transferred_creator_idx ON ethereum.nft_ownership_transferred (new_owner);