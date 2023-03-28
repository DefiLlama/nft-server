// migration file using node-pg-migrate
exports.up = (pgm) => {
  // add uuid extension
  pgm.sql(`CREATE EXTENSION IF NOT EXISTS "uuid-ossp";`);

  // collection table for static data
  pgm.sql(`
      CREATE TABLE collection (
        collection_id TEXT PRIMARY KEY,
        updated_at TIMESTAMPTZ NOT NULL DEFAULT current_timestamp,
        name TEXT NOT NULL,
        slug TEXT NOT NULL,
        image TEXT,
        total_supply NUMERIC NOT NULL,
        token_standard TEXT NOT NULL,
        project_url TEXT,
        twitter_username TEXT
      );
    `);

  // floor table for timeseries data
  pgm.sql(`
      CREATE TABLE floor (
        floor_id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
        collection_id TEXT NOT NULL REFERENCES "collection" ON DELETE CASCADE,
        timestamp TIMESTAMPTZ NOT NULL,
        on_sale_count NUMERIC,
        floor_price NUMERIC,
        floor_price_1_day NUMERIC,
        floor_price_7_day NUMERIC,
        floor_price_30_day NUMERIC,
        rank NUMERIC
      );
    `);

  // function
  pgm.sql(`
      CREATE OR REPLACE FUNCTION update_updated_at()
      RETURNS TRIGGER AS $$
      BEGIN
        NEW.updated_at := now();
        RETURN NEW;
      END;
      $$ LANGUAGE plpgsql;
    `);

  // trigger
  pgm.sql(`
      CREATE TRIGGER update_updated_at
      BEFORE UPDATE ON collection
      FOR EACH ROW
      EXECUTE FUNCTION update_updated_at();
    `);

  // composite index on timeseries table
  pgm.sql(`
      CREATE INDEX collection_id_timestamp_idx
      ON floor (collection_id ASC, timestamp DESC);
  `);

  // roles
  pgm.sql(`
      -- Revoke privileges from 'public' role
      REVOKE CREATE ON SCHEMA public FROM PUBLIC;
      REVOKE ALL ON DATABASE nft FROM PUBLIC;
      
      -- Read-only role
      CREATE ROLE readonly;
      GRANT CONNECT ON DATABASE nft TO readonly;
      GRANT USAGE ON SCHEMA public TO readonly;
      GRANT SELECT ON ALL TABLES IN SCHEMA public TO readonly;
      ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT SELECT ON TABLES TO readonly;
      
      -- Read/write role
      CREATE ROLE readwrite;
      GRANT CONNECT ON DATABASE nft TO readwrite;
      GRANT USAGE ON SCHEMA public TO readwrite;
      GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO readwrite;
      ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO readwrite;
      GRANT USAGE ON ALL SEQUENCES IN SCHEMA public TO readwrite;
      ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT USAGE ON SEQUENCES TO readwrite;
    `);

  // pct-change func
  pgm.sql(`
    CREATE OR REPLACE FUNCTION calculate_percent_change(
      current_price NUMERIC,
      yesterday_price NUMERIC
    ) RETURNS NUMERIC AS $$
    BEGIN
      IF yesterday_price IS NULL OR yesterday_price = 0 THEN
        RETURN NULL;
      ELSE
        RETURN ROUND(((current_price - yesterday_price) / yesterday_price) * 100, 5);
      END IF;
    END;
    $$ LANGUAGE plpgsql;
    `);
};
