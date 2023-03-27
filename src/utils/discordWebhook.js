const axios = require('axios');

const sendMessage = async (message, webhookUrl, formatted = true) => {
  const formattedMessage = formatted ? '```\n' + message + '\n```' : message;

  const response = await axios.post(`${webhookUrl}?wait=true`, {
    content: formattedMessage,
  });
  console.log('discord', response);
};

module.exports = sendMessage;
