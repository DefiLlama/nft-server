const { getCollectionWithoutCreator } = require('./queries');

const exe = async () => {
  const newCollections = await getCollectionWithoutCreator();
  const nb = newCollections.length;
  if (nb) {
    // - for each row, fetch creator address based on marketplace logic
  }

  // once synced, pausing for N sec before next run
  const pause = 60 * 1e3;
  console.log(`pausing exe for ${pause / 1e3}sec...\n`);
  await new Promise((resolve) => setTimeout(resolve, pause));
  await exe();
};

exe();
