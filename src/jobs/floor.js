const _ = require('lodash');
const axios = require('axios');

const { pgp, nft } = require('../utils/dbConnection');
const { convertKeysToSnakeCase } = require('../utils/keyConversion');

const sleep = (ms) => {
  return new Promise((resolve) => setTimeout(resolve, ms));
};

// multi row insert (update on conflict) query generator
const buildCollectionQ = (payload) => {
  const columns = [
    'collectionId',
    'name',
    'slug',
    'image',
    'tokenStandard',
    'totalSupply',
    'projectUrl',
    'twitterUsername',
  ].map((c) => _.snakeCase(c));

  const cs = new pgp.helpers.ColumnSet(columns, { table: 'collection' });
  const query =
    pgp.helpers.insert(payload, cs) +
    ' ON CONFLICT(collection_id) DO UPDATE SET ' +
    cs.assignColumns({ from: 'EXCLUDED', skip: 'collection_id' });

  return query;
};

// multi row insert query generator
const buildFloorQ = (payload) => {
  const columns = [
    'collectionId',
    'timestamp',
    'onSaleCount',
    'floorPrice',
    'rank',
  ].map((c) => _.snakeCase(c));

  const cs = new pgp.helpers.ColumnSet(columns, { table: 'floor' });
  return pgp.helpers.insert(payload, cs);
};

// --------- transaction query
const insertCollections = async (payload) => {
  // build queries
  const collectionQ = buildCollectionQ(payload);
  const floorQ = buildFloorQ(payload);

  return nft
    .tx(async (t) => {
      // sequence of queries:
      // 1. config: insert/update
      const q1 = await t.result(collectionQ);
      // 2. floor: insert
      const q2 = await t.result(floorQ);

      return [q1, q2];
    })
    .then((response) => {
      // success, COMMIT was executed
      return {
        status: 'success',
        data: response,
      };
    })
    .catch((err) => {
      // failure, ROLLBACK was executed
      console.log(err);
      return new Error('Transaction failed, rolling back', 404);
    });
};

(async () => {
  console.log('starting floor job...\n');
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
  process.exit();
})();
