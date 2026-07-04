// Dev-only migration for the `indexa` database.
//
// In production, `indexa` is a privately-managed raw-chain-data warehouse
// (see issue #12) that this repo has no control over. For local development
// we don't need the real thing — we only need tables shaped like the ones
// `src/adapters/queries.js` actually selects from/joins against, so that
// `node src/adapters/test.js` has something to read.
//
// This does NOT attempt to replicate the real indexer. It's a local dev
// fixture schema, paired with `scripts/seedIndexaDevData.js` which inserts
// a handful of real, correctly-ABI-encoded sample events so adapters can be
// smoke-tested end to end without access to the private indexer.
exports.up = (pgm) => {
  pgm.sql(`CREATE SCHEMA IF NOT EXISTS ethereum;`);

  // --- raw log data, read by src/adapters/queries.js (getEvents/getMaxBlock) ---
  pgm.sql(`
    CREATE TABLE ethereum.event_logs (
      transaction_hash BYTEA NOT NULL,
      log_index INTEGER NOT NULL,
      contract_address BYTEA NOT NULL,
      topic_0 BYTEA,
      topic_1 BYTEA,
      topic_2 BYTEA,
      topic_3 BYTEA,
      data BYTEA,
      block_time TIMESTAMPTZ NOT NULL,
      block_number BIGINT NOT NULL,
      block_hash BYTEA,
      PRIMARY KEY (transaction_hash, log_index)
    );
  `);
  pgm.sql(`CREATE INDEX event_logs_contract_topic_idx ON ethereum.event_logs (contract_address, topic_0, block_number);`);

  // --- joined for ETH/USD price at the block time (see queries.js: LEFT JOIN ethereum.blocks) ---
  pgm.sql(`
    CREATE TABLE ethereum.blocks (
      time TIMESTAMPTZ PRIMARY KEY,
      number BIGINT,
      price NUMERIC
    );
  `);

  // --- joined for tx from/to/input data (see queries.js: LEFT JOIN ethereum.transactions) ---
  pgm.sql(`
    CREATE TABLE ethereum.transactions (
      hash BYTEA PRIMARY KEY,
      from_address BYTEA,
      to_address BYTEA,
      data BYTEA
    );
  `);

  // --- aggregator detection (see queries.js: LEFT JOIN ethereum.nft_aggregators_appendage) ---
  pgm.sql(`
    CREATE TABLE ethereum.nft_aggregators_appendage (
      name TEXT,
      appendage_length INTEGER,
      appendage BYTEA
    );
  `);

  // --- internal call traces, used for sudoswap/manifold/wyvern-aggregator pricing ---
  pgm.sql(`
    CREATE TABLE ethereum.traces (
      trace_index INTEGER,
      transaction_hash BYTEA,
      from_address BYTEA,
      to_address BYTEA,
      value NUMERIC,
      block_number BIGINT
    );
  `);

  // --- output tables written by the real indexing jobs (src/adapters/index.js etc) ---
  pgm.sql(`
    CREATE TABLE ethereum.nft_trades (
      transaction_hash TEXT,
      log_index INTEGER,
      contract_address TEXT,
      topic_0 TEXT,
      block_time TIMESTAMPTZ,
      block_number BIGINT,
      exchange_name TEXT,
      collection TEXT,
      token_id NUMERIC,
      amount NUMERIC,
      sale_price NUMERIC,
      eth_sale_price NUMERIC,
      usd_sale_price NUMERIC,
      payment_token TEXT,
      seller TEXT,
      buyer TEXT,
      aggregator_name TEXT,
      aggregator_address TEXT,
      royalty_recipient TEXT,
      royalty_fee_eth NUMERIC,
      royalty_fee_usd NUMERIC
    );
  `);

  pgm.sql(`
    CREATE TABLE ethereum.nft_history (
      transaction_hash TEXT,
      log_index INTEGER,
      contract_address TEXT,
      topic_0 TEXT,
      block_time TIMESTAMPTZ,
      block_number BIGINT,
      exchange_name TEXT,
      event_type TEXT,
      collection TEXT,
      token_id NUMERIC,
      price NUMERIC,
      eth_price NUMERIC,
      usd_price NUMERIC,
      currency_address TEXT,
      user_address TEXT,
      event_id TEXT,
      expiration TIMESTAMPTZ
    );
  `);

  pgm.sql(`
    CREATE TABLE ethereum.nft_creator (
      transaction_hash TEXT,
      log_index INTEGER,
      contract_address TEXT,
      topic_0 TEXT,
      block_time TIMESTAMPTZ,
      block_number BIGINT,
      exchange_name TEXT,
      collection TEXT,
      token_id NUMERIC,
      creator TEXT,
      PRIMARY KEY (collection, token_id)
    );
  `);
};
