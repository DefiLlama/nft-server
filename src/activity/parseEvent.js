const ethers = require('ethers');

const { getEvents } = require('./queries');

const parseEvent = async (task, startBlock, endBlock, abi, config, parse) => {
  // read events from db
  const events = await getEvents(task, startBlock, endBlock, config);
  if (!events.length) return [];

  // instantiate abi interface
  const interface = new ethers.Interface(abi);
  for (const e of config.events) {
    config[e.signatureHash] = e.name;
  }

  // parse event data
  const parsedEvents = events.map((event) => {
    const data = `0x${event.data}`;
    const topics = [event.topic_0, event.topic_1, event.topic_2, event.topic_3]
      .filter(Boolean)
      .map((t) => `0x${t}`);

    const decodedEvent = interface.decodeEventLog(topics[0], data, topics);

    const parsedEvent = parse(decodedEvent, event);

    if (Object.keys(parsedEvent).length === 0) {
      return {};
    }

    // keeping a bunch of fields from event_logs
    const {
      topic_1,
      topic_2,
      topic_3,
      data: dataEncoded,
      price,
      tx_data,
      block_hash,
      ...rest
    } = event;

    return {
      ...rest,
      ...parsedEvent,
    };
  });

  // remove empty objects
  return parsedEvents.filter((event) => event.collection);
};

module.exports = parseEvent;
