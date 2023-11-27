CREATE TABLE IF NOT EXISTS ethereum.nft_aggregation (
    collection bytea,
    token_id bytea,
    block_time timestamp,
    block_number numeric,
    event_type bytea,
    exchange_name bytea,
    last_sale_price numeric,
    last_bid_price numeric,
    buy_now_price numeric,
    creator_address bytea,
    owner_address bytea,
    PRIMARY KEY (collection, token_id)
);

CREATE INDEX IF NOT EXISTS ethereum_nft_aggregation_creator_address_idx ON ethereum.nft_aggregation (creator_address);

CREATE INDEX IF NOT EXISTS ethereum_nft_aggregation_owner_address_idx ON ethereum.nft_aggregation (owner_address);