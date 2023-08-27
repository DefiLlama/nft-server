# nft-server

- set database urls in `config.env`
- test with: `node src/adapters/test.js --etype=trades --marketplace=blur-v1`
- to backfill:
  `node src/adapters/backfill.js --etype=trades --marketplace=blur-v1 --block=16797031 --blockRange=100 --blockStop=16790000`
