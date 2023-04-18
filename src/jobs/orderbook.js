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
  const columns = ['collectionId', 'timestamp', 'price', 'amount'].map((c) =>
    _.snakeCase(c)
  );
  const cs = new pgp.helpers.ColumnSet(columns, { table: 'orderbook' });

  const query = pgp.helpers.insert(payload, cs);
  const response = await nft.result(query);

  if (!response) {
    return new Error(`Couldn't insert into orderbook`, 404);
  }

  return response;
};

const job = async () => {
  const collections = await nft.query(getCollectionsQuery);

  const exArtblocks = collections.filter(
    (c) => !artblocks.includes(c.collection_id.split(':')[0])
  );

  let asks = [];
  const timestamp = new Date();
  const rateLimit = 4;
  for (let i = 0; i <= exArtblocks.length; i += rateLimit) {
    console.log(i);
    const calls = exArtblocks
      .slice(i, rateLimit + i)
      .map((c) =>
        axios.get(
          `${api}/orders/asks/v4?status=active&limit=${1000}&contracts=${
            c.collection_id
          }`,
          apiKey
        )
      );
    const X = (await Promise.allSettled(calls)).filter(
      (x) => x.status === 'fulfilled'
    );

    for (const x of X) {
      const valueCounts = x.value.data.orders?.reduce((acc, val) => {
        const price = val?.price?.amount?.native;
        acc[price] = (acc[price] || 0) + 1;
        return acc;
      }, {});

      const cid = x.value.data.orders[0]?.contract;
      if (!cid) continue;

      asks = [
        ...asks,
        ...Object.entries(valueCounts).map((i) => {
          return convertKeysToSnakeCase({
            collectionId: cid,
            timestamp,
            price: Number(i[0]),
            amount: i[1],
          });
        }),
      ];
    }
    await sleep(1000);
  }

  return await insert(asks);
};

module.exports = job;
