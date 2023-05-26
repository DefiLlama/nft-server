const { indexa } = require('../src/utils/dbConnection');
const { fetchTokenStandard, insert } = require('../src/jobs/tokenStandard');

(async () => {
  const allCollectionsRaw = await indexa.query(
    `SELECT DISTINCT collection FROM ethereum.nft_trades`
  );
  const ids = allCollectionsRaw.map((i) => `0x${i.collection.toString('hex')}`);

  const payload = await fetchTokenStandard(ids);
  const response = await insert(payload);
  console.log(response);
})();
