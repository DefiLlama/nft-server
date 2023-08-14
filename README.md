# nft-server

- set database urls in `config.env`
- test with: `node src/etype/trades/test.js --marketplace=blur`
- to backfill:
  `node src/etype/trades/backfill.js --marketplace=blur --block=16797031 --blockRange=100`
