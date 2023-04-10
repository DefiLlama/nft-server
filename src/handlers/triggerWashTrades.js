const { getMaxBlock, insertWashTrades } = require('../controllers/nftTrades');

module.exports.handler = async () => {
  await main();
};

const main = async () => {
  const offset = 7200 * 30;
  const endBlock = await getMaxBlock('ethereum.nft_trades');
  const startBlock = endBlock - offset;

  const response = await insertWashTrades(startBlock, endBlock);
  console.log(response);
};
