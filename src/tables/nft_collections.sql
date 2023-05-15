CREATE TABLE IF NOT EXISTS ethereum.nft_collections (
    collection bytea,
    token_standard bytea,
    royalty_recipient bytea,
    royalty_fee_pct numeric,
);

CREATE INDEX IF NOT EXISTS ethereum_nft_collections_collection_idx ON ethereum.nft_collections (collection);