const { getMaxBlock, insertWashTrades } = require('../adapters/queries');
const { indexa } = require('../utils/dbConnection');

(async () => {
  // 30day window
  const offset = 7200 * 30;

  const endBlock = await indexa.task(async (t) => {
    return await getMaxBlock(t, 'ethereum.nft_trades');
  });

  const startBlock = endBlock - offset;

  const response = await insertWashTrades(startBlock, endBlock);
  console.log(response);
})();
