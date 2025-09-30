const axios = require('axios');

const sendMessage = async (message, webhookUrl, formatted = true) => {
  const formattedMessage = formatted ? '```\n' + message + '\n```' : message;

  await axios.post(`${webhookUrl}?wait=true`, {
    content: formattedMessage,
  });
};

module.exports = sendMessage;
