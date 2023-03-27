const { getMaxBlock } = require('../controllers/nftTrades');
const sendMessage = require('../utils/discordWebhook');

module.exports.handler = async () => {
  await main();
};

const main = async () => {
  // get max blocks for each table
  let [blockEvents, blockTrades] = await Promise.all(
    ['event_logs', 'nft_trades'].map((table) =>
      getMaxBlock(`ethereum.${table}`)
    )
  );
  // if more than 50 blocks old (10mins) then we want to trigger a discord msg
  // likely that app failed
  const blockWindow = 50;
  const outdated = blockEvents - blockTrades > blockWindow;

  if (outdated) {
    const message = `nft_trades outdated by ${
      blockEvents - blockTrades
    } blocks!`;
    await sendMessage(message, process.env.NFT_TRADES_WEBHOOK);
  }
};
