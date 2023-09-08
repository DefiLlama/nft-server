const yargs = require('yargs');

const { indexa } = require('../utils/dbConnection');
const { castTypesCreator } = require('../utils/castTypes');
const parseEvent = require(`./parseEvent`);
const { deleteAndInsertEvents, deleteEvents } = require('../adapters/queries');

const argv = yargs.options({
  marketplace: {
    alias: 'm',
    type: 'string',
    demandOption: true,
    describe: 'adapter name, eg opensea-shared',
  },
  start: {
    type: 'number',
    demandOption: false,
    describe:
      'first block to fill from. if not given, will `blockStart` defined in adapter config',
  },
  stop: {
    type: 'number',
    demandOption: true,
    describe: 'end block to stop the filling process',
  },
  blockRange: {
    alias: 'r',
    type: 'number',
    demandOption: true,
    describe: 'block window size used for querying events from event_logs',
  },
}).argv;

const marketplace = argv.marketplace;
const blockStop = argv.stop;
const blockRange = argv.blockRange;

(async () => {
  console.log(`==== Refill ${marketplace} ====`);

  const { abi, config, parse } = require(`./${marketplace}`);
  let startBlock = argv.start ?? config.blockStart;

  const table = 'ethereum.nft_creator';

  let endBlock = startBlock + blockRange;

  console.log(`starting refill from ${startBlock}...`);
  while (true) {
    const pEvents = await indexa.task(async (t) => {
      return await parseEvent(t, startBlock, endBlock, abi, config, parse);
    });

    if (pEvents.length) {
      const payload = pEvents.map((e) => castTypesCreator(e));
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

    if (endBlock === blockStop) {
      console.log('reached blockStop, exiting!');
      process.exit();
    }

    // update blocks
    startBlock = endBlock + 1;
    endBlock = Math.min(startBlock + blockRange, blockStop);
  }
})();
