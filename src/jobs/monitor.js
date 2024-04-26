const sdk = require('@defillama/sdk');
const { getMaxBlock } = require('../adapters/queries');
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
  const lastEthereumBlock = (await sdk.blocks.getCurrentBlocks()).ethereumBlock;

  // if more than 50 blocks old (10mins) then we want to trigger a discord msg
  // likely that app failed
  if (blockEvents - blockTrades > blockRangeMonitor) {
    const message = `nft_trades outdated by ${
      blockEvents - blockTrades
    } blocks!`;
    await sendMessage(message, process.env.NFT_TRADES_WEBHOOK);
  } else if (lastEthereumBlock - blockEvents > blockRangeMonitor) {
    const message = `event_logs outdated by ${
      lastEthereumBlock - blockEvents
    } blocks!`;
    await sendMessage(message, process.env.NFT_TRADES_WEBHOOK);
  }
};

module.exports = job;
