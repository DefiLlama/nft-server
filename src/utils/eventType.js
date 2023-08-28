const getEventType = (config, event) => {
  return config.events.find((e) => e.signatureHash === `0x${event.topic_0}`)
    ?.name;
};

module.exports = getEventType;
