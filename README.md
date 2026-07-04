# nft-server

## Dev environment setup

1. `cp config.env.example config.env`
2. `docker-compose up -d` — starts Postgres (with the `nft` db and a local
   `ethereum` db standing in for the privately-managed `indexa` source) and
   automatically runs migrations + seeds one sample trade event per
   supported adapter.
3. `node src/adapters/test.js --etype=trades --marketplace=blur-v1` — should
   print a parsed sale event using the seeded data.

Note: the real `indexa` database is a privately-managed raw-chain-data
warehouse this repo doesn't control (see issue #12), so this setup does not
attempt to replicate it. `migrations-indexa/` + `scripts/seedIndexaDevData.js`
instead create a minimal local stand-in schema and insert real,
correctly-ABI-encoded sample events, which is enough to exercise each
adapter's parsing logic end to end without needing access to production
data. To add coverage for another adapter, add an entry to the `seeds` array
in `scripts/seedIndexaDevData.js`.

Running the pieces manually instead of via Docker:
- `npm run migrate:nft` — runs migrations against `DATABASE_URL_NFT`
- `npm run migrate:indexa` — runs the dev-schema migrations against `DATABASE_URL_INDEXA`
- `npm run seed:indexa` — inserts sample events
- `npm run dev:setup` — runs all three in order

## Usage

- test with: `node src/adapters/test.js --etype=trades --marketplace=blur-v1`
- to backfill:
  `node src/adapters/backfill.js --etype=trades --marketplace=blur-v1 --block=16797031 --blockRange=100 --blockStop=16790000`
