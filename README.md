# nft-server

- set database urls in `config.env`
- test with: `node src/etype/test.js --etype=trades --marketplace=blur`
- to backfill:
  `node src/etype/backfill.js --etype=trades --marketplace=blur --block=16797031 --blockRange=100`
