const _ = require('lodash');
const axios = require('axios');

const sleep = require('../utils/sleep');
const { getCollectionsQuery } = require('../api/controllers/floor');
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

const orders = async (collections, route, timestamp) => {
  let d = [];
  const rateLimit = 2;
  for (let i = 0; i <= collections.length; i += rateLimit) {
    console.log(i);
    const requests = collections
      .slice(i, rateLimit + i)
      .map(
        (c) =>
          `${api}/orders/${route}?status=active&limit=${1000}&contracts=${
            c.collection_id
          }`
      );
    const X = (
      await Promise.allSettled(requests.map((r) => axios.get(r, apiKey)))
    ).filter((x) => x.status === 'fulfilled');

    for (const x of X) {
      const valueCounts = x.value.data.orders?.reduce((acc, val) => {
        const price = val?.price?.amount?.native;
        acc[price] = (acc[price] || 0) + 1;
        return acc;
      }, {});

      const cid = x.value.data.orders[0]?.contract;
      if (!cid) continue;

      d = [
        ...d,
        ...Object.entries(valueCounts).map((i) => {
          return convertKeysToSnakeCase({
            collectionId: cid,
            timestamp,
            price: Number(i[0]),
            amount: i[1],
            orderType: route.includes('ask') ? 'ask' : 'bid',
          });
        }),
      ];
    }
    await sleep(1000);
  }
  return d;
};

const job = async () => {
  const collections = await nft.query(getCollectionsQuery);

  const exArtblocks = collections.filter(
    (c) => !artblocks.includes(c.collection_id.split(':')[0])
  );

  const timestamp = new Date();

  const [asks, bids] = await Promise.all(
    ['asks/v4', 'bids/v5'].map((route) => orders(exArtblocks, route, timestamp))
  );

  const payload = [...asks, ...bids];
  console.log('inserting orderbook...');
  console.log(payload.length);
  const response = await insert(payload);
  console.log(response);
};

module.exports = job;
