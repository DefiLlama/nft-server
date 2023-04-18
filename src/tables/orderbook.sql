CREATE TABLE IF NOT EXISTS orderbook (
    collection_id TEXT NOT NULL REFERENCES "collection" ON DELETE CASCADE,
    timestamp TIMESTAMPTZ NOT NULL,
    price numeric,
    amount numeric
);

CREATE INDEX IF NOT EXISTS orderbook_collection_id_timestamp_idx ON orderbook (collection_id ASC, timestamp DESC);