CREATE TABLE IF NOT EXISTS ethereum.nft_creator (
    transaction_hash bytea,
    log_index numeric,
    contract_address bytea,
    topic_0 bytea,
    block_time timestamp,
    block_number numeric,
    exchange_name bytea,
    collection bytea,
    token_id bytea,
    creator bytea,
    UNIQUE (collection, token_id)
);

CREATE INDEX IF NOT EXISTS ethereum_nft_creator_collection_idx ON ethereum.nft_creator (collection);

CREATE INDEX IF NOT EXISTS ethereum_nft_creator_token_id_idx ON ethereum.nft_creator (token_id);

CREATE INDEX IF NOT EXISTS ethereum_nft_creator_creator_idx ON ethereum.nft_creator (creator);

CREATE INDEX IF NOT EXISTS ethereum_nft_creator_exchange_name_idx ON ethereum.nft_creator (exchange_name);