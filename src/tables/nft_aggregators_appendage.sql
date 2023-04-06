CREATE TABLE IF NOT EXISTS ethereum.nft_aggregators_appendage (
    name text NOT NULL,
    appendage bytea NOT NULL UNIQUE,
    appendage_length integer NOT NULL
);