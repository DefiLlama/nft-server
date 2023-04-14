const { getMaxBlock, insertWashTrades } = require('../controllers/nftTrades');
const { connect } = require('../utils/dbConnection');

module.exports.handler = async () => {
  await main();
};

const main = async () => {
  // 30day window
  const offset = 7200 * 30;

  const conn = await connect('indexa');
  const endBlock = await conn.task(async (t) => {
    return await getMaxBlock(t, 'ethereum.nft_trades');
  });

  const startBlock = endBlock - offset;

  const response = await insertWashTrades(startBlock, endBlock);
  console.log(response);
};
