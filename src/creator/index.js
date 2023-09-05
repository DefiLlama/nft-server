const {
  getCollectionWithoutCreator,
  insertCreator,
  limit,
} = require('./queries');
const { parse } = require('./fetchShared');
const { castTypesCreator } = require('../utils/castTypes');

const exe = async () => {
  let stale = true;

  while (stale) {
    const newCollections = await getCollectionWithoutCreator();

    const nb = newCollections.length;

    if (nb) {
      let creators = await Promise.all(
        newCollections.map(async (row) => ({
          collection: row.collection,
          tokenId: row.tokenId,
          creator: await parse(row),
        }))
      );
      creators = creators.filter((c) => c.creator);

      let response;
      if (creators.length) {
        // insert
        const payload = creators.map((e) => castTypesCreator(e));
        response = await insertCreator(payload);
        console.log(`inserted ${response?.rowCount ?? 0}`);
      }
    }
    stale = nb === limit;
  }

  // once synced, pausing for N sec before next run
  const pause = 60 * 1e3;
  console.log(`pausing exe for ${pause / 1e3}sec...\n`);
  await new Promise((resolve) => setTimeout(resolve, pause));
  await exe();
};

exe();
