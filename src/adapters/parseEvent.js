const ethers = require('ethers');

const getEvents = require('../controllers/eventLogs');
const aggregators = require('./aggregators');
const { nftTransferEvents } = require('../utils/params');

const parseEvent = async (startBlock, endBlock, abi, config, parse) => {
  // read events from db
  const events = await getEvents(startBlock, endBlock, config);

  // instantiate abi interface
  const interface = new ethers.Interface(abi);
  for (const e of config.events) {
    config[e.signatureHash] = e.name;
  }

  const marketplaceEvents =
    config.version === 'wyvern' ||
    config.exchangeName === 'rarible' ||
    config.exchangeName === 'zora'
      ? events.filter((e) =>
          config.events.map((ev) => ev.signatureHash).includes(`0x${e.topic_0}`)
        )
      : events;
  // will be empty for all marketplace for which we don't read nft transfer events
  const transferEvents = events.filter((e) =>
    Object.values(nftTransferEvents).includes(e.topic_0)
  );

  // parse event data
  const parsedEvents = await Promise.all(
    marketplaceEvents.map(async (event) => {
      const data = `0x${event.data}`;
      const topics = [
        event.topic_0,
        event.topic_1,
        event.topic_2,
        event.topic_3,
      ]
        .filter(Boolean)
        .map((t) => `0x${t}`);

      const decodedEvent = interface.decodeEventLog(topics[0], data, topics);
      const parsedEvent = await parse(decodedEvent, event, transferEvents);
      // only keep parsed events with full information
      if (Object.values(parsedEvent).some((i) => i === undefined)) return {};

      // check if aggregator tx
      const aggregator = aggregators.find((agg) =>
        agg.contracts.includes(`0x${event.to_address}`)
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
