const insert = require('../controllers/floor');

const axios = require('axios');

module.exports.handler = async () => {
  await main();
};

const main = async () => {
  const api = 'https://api.reservoir.tools';
  // get top 1k collections based on all time volume
  const top1k = (await axios.get(`${api}/search/collections/v1?limit=1000}`))
    .data.collections;
  // get the collection addresses
  const collections = top1k.map((c) => c.collectionId.slice(0, 42));

  const promises = collections.map((c) =>
    axios.get(`${api}/collections/v5?id=${c}&includeOwnerCount=true`)
  );

  const collectionDetails = (await Promise.allSettled(promises))
    .filter((x) => x.status === 'fulfilled')
    .map((x) => x.value.data.collections);
  console.log('nb of failed pulls', 1000 - collectionDetails.length);

  const timestamp = new Date(Date.now());

  //  map columNames
  const payload = collectionDetails.map((c) => {
    const {
      id,
      name,
      slug,
      image,
      description,
      tokenCount,
      contractKind,
      onSaleCount,
      floorAsk: {
        price: {
          amount: { native },
        },
      },
      floorSale,
      ownerCount,
    } = c;

    return {
      timestamp,
      collection: id,
      name,
      slug,
      image,
      description,
      totalSupply: tokenCount,
      contractKind,
      onSaleCount,
      floorPrice: native,
      floorPrice1d: floorSale['1day'],
      floorPrice7d: floorSale['7day'],
      floorPrice30d: floorSale['30day'],
      ownerCount,
    };
  });

  // db insert
  const response = await insert(payload);
  console.log(response);
};
