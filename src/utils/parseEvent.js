const ethers = require('ethers');

const getEvents = require('../controllers/eventLogs');

const parseEvent = async (
  startBlock,
  endBlock,
  abi,
  config,
  parse,
  test = false
) => {
  // 1. format functionSignatureHashes for db query
  const eventSignatureHash = config.events.map(
    (e) => `\\${e.signatureHash.slice(1)}`
  );

  // 2. read events from db
  const events = await getEvents(
    startBlock,
    endBlock,
    eventSignatureHash,
    test
  );

  // 3. instantiate interfaces for each event defined in config.json
  for (const e of config.events) {
    config[e.signatureHash] = {
      name: e.name,
      interface: new ethers.Interface([abi.find((m) => m.name === e.name)]),
    };
  }

  // 4. parse event data
  const parsedEvents = events.map((event) => {
    const data = `0x${event.data}`;
    const topics = [event.topic_0, event.topic_1, event.topic_2, event.topic_3]
      .filter(Boolean)
      .map((t) => `0x${t}`);

    const { interface, name } = config[topics[0]];

    const parsedEvent = parse(data, topics, interface, name, event);

    // keeping a bunch of fields from event_logs
    const {
      topic_1,
      topic_2,
      topic_3,
      data: dataEncoded,
      price,
      ...rest
    } = event;

    return { ...rest, ...parsedEvent, exchangeName: config.exchangeName };
  });

  return parsedEvents.filter((event) => event.collection);
};

module.exports = parseEvent;
