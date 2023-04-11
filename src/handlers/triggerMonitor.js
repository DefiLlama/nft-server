const { getMaxBlock } = require('../controllers/nftTrades');
const sendMessage = require('../utils/discordWebhook');
const { blockRangeMonitor } = require('../utils/params');

module.exports.handler = async () => {
  await main();
};

const main = async () => {
  // get max blocks for each table
  const blockEvents = await getMaxBlock('ethereum.event_logs');
  const blockTrades = await getMaxBlock('ethereum.nft_trades');

  // if more than 50 blocks old (10mins) then we want to trigger a discord msg
  // likely that app failed
  const outdated = blockEvents - blockTrades > blockRangeMonitor;

  if (outdated) {
    const message = `nft_trades outdated by ${
      blockEvents - blockTrades
    } blocks!`;
    await sendMessage(message, process.env.NFT_TRADES_WEBHOOK);
  }
};
