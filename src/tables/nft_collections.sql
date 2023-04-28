CREATE TABLE IF NOT EXISTS ethereum.nft_collections (collection bytea, token_standard bytea);

CREATE INDEX IF NOT EXISTS ethereum_nft_collections_collection_idx ON ethereum.nft_collections (collection);