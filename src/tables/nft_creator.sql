CREATE TABLE IF NOT EXISTS ethereum.nft_creator (
    collection bytea,
    token_id bytea,
    creator bytea
);

CREATE INDEX IF NOT EXISTS ethereum_nft_creator_collection_idx ON ethereum.nft_creator (collection);

CREATE INDEX IF NOT EXISTS ethereum_nft_creator_token_id_idx ON ethereum.nft_creator (token_id);

CREATE INDEX IF NOT EXISTS ethereum_nft_creator_creator_idx ON ethereum.nft_creator (creator);