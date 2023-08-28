const yargs = require('yargs');

const { indexa } = require('../utils/dbConnection');
const castTypes = require('../utils/castTypes');

const argv = yargs.options({
  etype: {
    alias: 'e',
    type: 'string',
    demandOption: true,
    describe: 'event type, eg trades',
    choices: ['trades', 'transfers', 'history'],
  },
  marketplace: {
    alias: 'm',
    type: 'string',
    demandOption: true,
    describe: 'adapter name, eg blur',
  },
  block: {
    alias: 'b',
    type: 'number',
    demandOption: true,
    describe:
      'min(block_number) - 1 from the chosen event table; we go backwards from that block',
  },
  blockRange: {
    alias: 'r',
    type: 'number',
    demandOption: true,
    describe: 'block window size used for querying events from event_logs',
  },
  blockStop: {
    alias: 's',
    type: 'number',
    demandOption: true,
    describe: 'block at which backfill will stop',
  },
}).argv;

const etype = argv.etype;
const marketplace = argv.marketplace;
let endBlock = argv.block;
const blockRange = argv.blockRange;
const blockStop = argv.blockStop;

(async () => {
  console.log(`==== Refill ${etype}:${marketplace} ====`);

  const { abi, config, parse } =
    etype !== 'transfers'
      ? require(`./${marketplace}`)
      : { undefined, undefined, undefined };

  if (config) {
    config.events = config.events.filter((e) =>
      etype === 'trades' ? e?.saleEvent : e?.saleEvent !== true
    );

    if (!config.events.length) {
      console.error(`no config events for selected ${etype}:${marketplace}!`);
      process.exit(0);
    }
  }

  const parseEvent = ['trades', 'history'].includes(etype)
    ? require(`./parseEvent`)
    : require('./parseEventTransfers');

  const castDataTypes =
    etype === 'trades'
      ? castTypes.castTypesTrades
      : etype === 'history'
      ? castTypes.castTypesHistory
      : castTypes.castTypesTransfers;

  const { deleteAndInsertEvents, deleteEvents } = [
    'trades',
    'history',
  ].includes(etype)
    ? require('./queries')
    : require('./queriesTransfers');

  const table = `ethereum.nft_${etype}`;

  let startBlock = endBlock - blockRange;

  console.log(`starting refill from ${endBlock}...`);
  while (true) {
    const pEvents = await indexa.task(async (t) => {
      return await parseEvent(t, startBlock, endBlock, abi, config, parse);
    });

    if (pEvents.length) {
      const payload = pEvents.map((e) => castDataTypes(e));
      const response = await deleteAndInsertEvents(
        payload,
        startBlock,
        endBlock,
        config,
        table
      );

      console.log(
        `filled ${startBlock}-${endBlock} [deleted: ${response.data[0].rowCount} inserted: ${response.data[1].rowCount}]`
      );
    } else {
      const response = await deleteEvents(startBlock, endBlock, config, table);
      console.log(
        `filled ${startBlock}-${endBlock} [deleted:  ${response.rowCount} inserted: 0]`
      );
    }

    // update blocks
    endBlock = startBlock - 1; // query is inclusive
    startBlock = endBlock - blockRange;

    if (startBlock < blockStop) {
      console.log('reached blockStop, exiting!');
      process.exit();
    }
  }
})();
