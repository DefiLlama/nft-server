# nft_server

- set database urls in `config.env`
- test with: `node src/adapters/test.js --marketplace=blur`
- to backfill:
  `node src/scripts/backfill.js --marketplace=blur --block=16797031 --deletePriorInsert`
