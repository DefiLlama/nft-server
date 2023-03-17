const ethers = require('ethers');

const getEvents = require('../controllers/eventLogs');
const aggregators = require('./aggregators');

const parseEvent = async (
  startBlock,
  endBlock,
  abi,
  config,
  parse,
  test = false
) => {
  // read events from db
  const events = await getEvents(startBlock, endBlock, config, test);

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

      const name = config[topics[0]];
      const decodedEvent = interface.decodeEventLog(name, data, topics);
      // most adapters only require decodedEvent and event (for the eth price).
      // interface and or eventName are only used in case event.tx_data needs to parsed
      // and/or if `decodedEvent` fields are different for eventName (in case of
      // more than 1 nft trade event)
      const parsedEvent = await parse(decodedEvent, event, interface, name);
      // only keep parsed events with full information
      if (Object.values(parsedEvent).some((i) => i === undefined)) return {};

      // check if aggregator tx
      const aggregator = aggregators.find((agg) =>
        topics.includes(agg.address)
      );

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
        exchangeName: config.exchangeName,
        aggregatorName: aggregator?.name ?? null,
        aggregatorAddress: aggregator?.address ?? null,
      };
    })
  );

  // remove empty objects
  return parsedEvents.filter((event) => event.collection);
};

module.exports = parseEvent;
