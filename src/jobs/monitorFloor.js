const { nft } = require('../utils/dbConnection');
const sendMessage = require('../utils/discordWebhook');

const job = async () => {
  const query = `
    SELECT
        max(timestamp)
    FROM
        floor
    `;

  const response = await nft.result(query);

  if (!response) {
    return new Error(`Couldn't get data`, 404);
  }

  const maxTimestamp = response.rows[0].max;
  const now = new Date();
  const delta = (now - maxTimestamp) / 1000 / 60;

  // 2hours max
  if (delta > 120) {
    const message = `stale nft floor data. last update ${delta} min old!`;
    await sendMessage(message, process.env.NFT_FLOOR_WEBHOOK);
  }
  console.log('done');
};

module.exports = job;
