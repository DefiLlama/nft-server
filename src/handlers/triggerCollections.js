const axios = require('axios');

const { insertCollections } = require('../controllers/collections');
const { convertKeysToSnakeCase } = require('../utils/keyConversion');

const sleep = (ms) => {
  return new Promise((resolve) => setTimeout(resolve, ms));
};

module.exports.handler = async () => {
  await main();
};

const main = async () => {
  console.log('trigger Collections handler...\n');
  const api = 'https://api.reservoir.tools';

  const apiKey = {
    headers: { 'x-api-key': process.env.RESERVOIR_API },
  };

  // get top 1k collections based on all time volume
  // note: collections/v1 'only' inlcudes floor price but no floor price history/totalSupply etc
  // which is why we call /collections/v5.
  // we use collections/v1 mainly to obtain a list of top N collections sorted by all time trade volume
  const top1k = (
    await axios.get(`${api}/search/collections/v1?limit=1000`, apiKey)
  ).data.collections;
  await sleep(1000);

  // remove artblocks (requires separate call cause contract identical between arbtlocks nfts which breaks the
  // the following api calls)
  const exArtBlocks = top1k.filter((c) => c.collectionId.length <= 42);
  const artBlocksInTop1k = top1k.length - exArtBlocks.length;

  // get the collection addresses
  const ids = exArtBlocks.map((c) => c.collectionId);

  // collections/v5 accepts a max of 20 collection ids per request
  const size = 20;
  const requests = [];
  for (let i = 0; i < ids.length; i += size) {
    const batch = ids.slice(i, size + i).join('&contract=');
    requests.push(axios.get(`${api}/collections/v5?contract=${batch}`, apiKey));
  }

  // free api key rate limite = 4RPS
  const rateLimit = 4;
  let collectionDetails = [];
  for (let i = 0; i <= requests.length; i += rateLimit) {
    console.log(i);
    const X = (await Promise.allSettled(requests.slice(i, rateLimit + i)))
      .filter((x) => x.status === 'fulfilled')
      .map((x) => x.value.data.collections)
      .flat();
    collectionDetails = [...collectionDetails, ...X];
    await sleep(1000);
  }

  // get artblocks
  const calls = Math.ceil(artBlocksInTop1k / size);
  const artblocksUrl = `${api}/collections/v5?community=artblocks`;

  let continuation;
  let collections;
  for (let i = 0; i < calls; i++) {
    const url =
      i === 0 ? artblocksUrl : `${artblocksUrl}&continuation=${continuation}`;

    ({ collections, continuation } = (await axios.get(url, apiKey)).data);
    await sleep(1000);

    collectionDetails = [...collectionDetails, ...collections];
  }

  const timestamp = new Date(Date.now());
  const seen = new Set();
  const payload = [];
  for (const c of collectionDetails) {
    if (seen.has(c.id)) continue;

    payload.push(
      convertKeysToSnakeCase({
        timestamp,
        collectionId: c.id,
        name: c.name,
        slug: c.slug,
        image: c.image,
        tokenStandard: c.contractKind,
        totalSupply: Number(c.tokenCount),
        onSaleCount: Number(c.onSaleCount),
        floorPrice: c.floorAsk?.price?.amount?.native ?? null,
        floorPrice1day: c.floorSale['1day'],
        floorPrice7day: c.floorSale['7day'],
        floorPrice30day: c.floorSale['30day'],
        rank: c.rank['1day'],
        projectUrl: c.externalUrl,
        twitterUsername: c.twitterUsername,
      })
    );
    seen.add(c.id);
  }

  console.log(collectionDetails.length, payload.length);

  // db insert
  console.log('insert collections...');
  const response = await insertCollections(payload);
  console.log(response);
  console.log('done!');
};
