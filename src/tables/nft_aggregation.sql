CREATE TABLE IF NOT EXISTS ethereum.nft_aggregation (
    collection bytea,
    token_id bytea,
    transaction_hash bytea,
    block_time timestamp,
    block_number numeric,
    log_index numeric,
    exchange_name bytea,
    eth_sale_price numeric,
    owner_address bytea,
    creator_address bytea,
    PRIMARY KEY (collection, token_id)
);

CREATE INDEX IF NOT EXISTS ethereum_nft_aggregation_creator_address_idx ON ethereum.nft_aggregation (creator_address);

CREATE INDEX IF NOT EXISTS ethereum_nft_aggregation_owner_address_idx ON ethereum.nft_aggregation (owner_address);