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
  const parsedEvents = await Promise.all(
    events.map(async (event) => {
      const data = `0x${event.data}`;
      const topics = [
        event.topic_0,
        event.topic_1,
        event.topic_2,
        event.topic_3,
      ]
        .filter(Boolean)
        .map((t) => `0x${t}`);

      let decodedEvent;
      try {
        decodedEvent = interface.decodeEventLog(topics[0], data, topics);
      } catch (err) {
        console.log('incorrent/unavailable abi for', event.transaction_hash);
      }

      const parsedEvent = await parse(decodedEvent);

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
        aggregator_name,
        ...rest
      } = event;

      // trade event
      return {
        ...rest,
        ...parsedEvent,
        exchangeName: config.exchangeName,
      };
    })
  );

  return parsedEvents;
};

module.exports = parseEvent;
