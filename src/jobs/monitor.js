const { getMaxBlock } = require('../etype/trades/queries');
const sendMessage = require('../utils/discordWebhook');
const { blockRangeMonitor } = require('../utils/params');
const { indexa } = require('../utils/dbConnection');

const job = async () => {
  // get max blocks for each table
  let [blockEvents, blockTrades] = await indexa.task(async (t) => {
    return await Promise.all(
      ['event_logs', 'nft_trades'].map((table) =>
        getMaxBlock(t, `ethereum.${table}`)
      )
    );
  });

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

module.exports = job;
