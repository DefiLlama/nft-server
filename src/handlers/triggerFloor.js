const insert = require('../controllers/floor');
const convertKeysToSnakeCase = require('../utils/snakeCase');

const axios = require('axios');

module.exports.handler = async () => {
  await main();
};

const main = async () => {
  console.log('trigger FloorPrice handler...\n');
  const api = 'https://api.reservoir.tools';
  // get top 1k collections based on all time volume
  const top1k = (await axios.get(`${api}/search/collections/v1?limit=1000`))
    .data.collections;
  // get the collection addresses
  const collections = top1k.map((c) => c.collectionId.slice(0, 42));

  const promises = collections.map((c) =>
    axios.get(`${api}/collections/v5?id=${c}&includeOwnerCount=true`)
  );

  const collectionDetails = (await Promise.allSettled(promises))
    .filter((x) => x.status === 'fulfilled')
    .map((x) => x.value.data.collections)
    .flat();
  console.log('nb of failed pulls:', 1000 - collectionDetails.length);

  const timestamp = new Date(Date.now());
  const seen = new Set();
  const payload = [];
  for (const c of collectionDetails) {
    if (seen.has(c.id)) continue;

    payload.push(
      convertKeysToSnakeCase({
        timestamp,
        collectionID: c.id,
        name: c.name,
        slug: c.slug,
        image: c.image,
        description: c.description,
        totalSupply: Number(c.tokenCount),
        tokenStandard: c.contractKind,
        onSaleCount: Number(c.onSaleCount),
        floorPrice: c.floorAsk?.price?.amount?.native ?? null,
        floorPrice1day: c.floorSale['1day'],
        floorPrice7day: c.floorSale['7day'],
        floorPrice30day: c.floorSale['30day'],
        ownerCount: c.ownerCount,
      })
    );
    seen.add(c.id);
  }

  // db insert
  console.log('db insert...');
  const response = await insert(payload);
  console.log(response);
  console.log('done!');
  process.exit();
};
