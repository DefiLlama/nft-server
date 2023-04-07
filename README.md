# nft-server

- set database urls in `config.env`
- test with: `node src/adapters/test.js --marketplace=blur`
- to backfill:
  `node src/adapters/backfill.js --marketplace=blur --block=16797031 --blockRange=100`
