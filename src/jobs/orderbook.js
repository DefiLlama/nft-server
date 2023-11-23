const _ = require('lodash');
const axios = require('axios');

const sleep = require('../utils/sleep');
const { convertKeysToSnakeCase } = require('../utils/keyConversion');
const { pgp, nft } = require('../utils/dbConnection');

const api = 'https://api.reservoir.tools';

const apiKey = {
  headers: { 'x-api-key': process.env.RESERVOIR_API_ORDERBOOK },
};

const artblocks = [
  '0xa7d8d9ef8d8ce8992df33d8b8cf4aebabd5bd270',
  '0x059edd72cd353df5106d2b9cc5ab83a52287ac3a',
  '0x99a9b7c1116f9ceeb1652de04d5969cce509b069',
];

// multi row insert
const insert = async (payload) => {
  const columns = [
    'collectionId',
    'timestamp',
    'price',
    'amount',
    'orderType',
  ].map((c) => _.snakeCase(c));
  const cs = new pgp.helpers.ColumnSet(columns, { table: 'orderbook' });

  const query = pgp.helpers.insert(payload, cs);
  const response = await nft.result(query);

  if (!response) {
    return new Error(`Couldn't insert into orderbook`, 404);
  }

  return response;
};

const orders = async (collections, side, timestamp) => {
  let d = [];
  const rateLimit = 5;
  for (let i = 0; i <= collections.length; i += rateLimit) {
    console.log(i);
    const requests = collections
      .slice(i, rateLimit + i)
      .map(
        (c) =>
          `${api}/orders/depth/v1?side=${side}&collection=${c.collection_id}`
      );

    const X = (
      await Promise.allSettled(requests.map((r) => axios.get(r, apiKey)))
    ).filter((x) => x.status === 'fulfilled');

    for (const x of X) {
      const cid = x.value.config.url.split('collection=')[1];
      if (!cid) continue;

      d = [
        ...d,
        ...x.value.data.depth.map((i) => {
          return convertKeysToSnakeCase({
            collectionId: cid,
            timestamp,
            price: i.price,
            amount: i.quantity,
            orderType: side === 'sell' ? 'ask' : 'bid',
          });
        }),
      ];
    }
    await sleep(1000);
  }
  return d;
};

const job = async () => {
  const collections = await nft.query(
    'SELECT * FROM mv_collections_floor_price'
  );

  const exArtblocks = collections.filter(
    (c) => !artblocks.includes(c.collection_id.split(':')[0])
  );

  const timestamp = new Date();

  const [asks, bids] = await Promise.all(
    ['sell', 'buy'].map((side) => orders(exArtblocks, side, timestamp))
  );

  const payload = [...asks, ...bids];
  console.log('inserting orderbook...');
  console.log(payload.length);
  const response = await insert(payload);
  console.log(response);
};

module.exports = job;
