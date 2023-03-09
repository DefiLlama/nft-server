// migration file using node-pg-migrate
exports.up = (pgm) => {
  pgm.sql(`
      CREATE TABLE collection (
        collection_id VARCHAR(42) PRIMARY KEY,
        updated_at TIMESTAMPTZ NOT NULL DEFAULT current_timestamp,
        name TEXT NOT NULL,
        slug TEXT NOT NULL,
        image TEXT,
        total_supply NUMERIC NOT NULL,
        token_standard TEXT NOT NULL
      );
    `);

  pgm.sql(`
      CREATE TABLE floor (
        floor_id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
        collection_id VARCHAR(42) NOT NULL REFERENCES "collection" ON DELETE CASCADE,
        timestamp TIMESTAMPTZ NOT NULL,
        on_sale_count NUMERIC,
        floor_price NUMERIC,
        floor_price_1_day NUMERIC,
        floor_price_7_day NUMERIC,
        floor_price_30_day NUMERIC,
        owner_count NUMERIC
      );
    `);

  pgm.sql(`
      CREATE OR REPLACE FUNCTION update_updated_at()
      RETURNS TRIGGER AS $$
      BEGIN
        NEW.updated_at := now();
        RETURN NEW;
      END;
      $$ LANGUAGE plpgsql;
    `);

  pgm.sql(`
      CREATE TRIGGER update_updated_at
      BEFORE UPDATE ON collection
      FOR EACH ROW
      EXECUTE FUNCTION update_updated_at();
    `);
};
