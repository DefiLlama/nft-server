const { getMaxBlock, insertWashTrades } = require('../adapters/queries');
const { indexa } = require('../utils/dbConnection');

const job = async () => {
  // 30day window
  const days = 30;
  const blocksPerDay = 7200;
  const offset = blocksPerDay * days;

  const endBlock = await indexa.task(async (t) => {
    return await getMaxBlock(t, 'ethereum.nft_trades');
  });

  const startBlock = endBlock - offset;

  const response = await insertWashTrades(startBlock, endBlock);
  console.log(response);
};

module.exports = job;
