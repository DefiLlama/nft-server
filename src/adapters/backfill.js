const yargs = require('yargs');

const { deleteAndInsertTrades, insertTrades } = require('./queries');
const parseEvent = require('./parseEvent');
const castTypes = require('../utils/castTypes');
const { indexa } = require('../utils/dbConnection');

const argv = yargs.options({
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
      'min(block_number) - 1 from nft_trades; we go backwards from that block',
  },
  blockRange: {
    alias: 'r',
    type: 'number',
    demandOption: true,
    describe: 'block window size used for querying events from event_logs',
  },
  deletePriorInsert: {
    type: 'string',
    demandOption: false,
    default: 'true',
    choices: ['true', 'false'],
    describe:
      'will delete any rows in the table prior to insertion by default. set to false to disable (eg useful for new adapter or older blockrange for which we dont have any data yet)',
  },
  blockStop: {
    alias: 's',
    type: 'number',
    demandOption: false,
    describe: 'block at which backfill will stop',
  },
}).argv;

const marketplace = argv.marketplace;
let endBlock = argv.block;
const deletePriorInsert = argv.deletePriorInsert === 'false' ? false : true;
const blockRange = argv.blockRange;
const blockStop = argv.blockStop;

(async () => {
  console.log(`==== Refill ${marketplace} ====`);

  const { abi, config, parse } = require(`../adapters/${marketplace}`);
  let startBlock = endBlock - blockRange;

  console.log(`starting refill from ${endBlock}...`);
  while (true) {
    const trades = await indexa.task(async (t) => {
      return await parseEvent(t, startBlock, endBlock, abi, config, parse);
    });

    if (trades.length) {
      const payload = castTypes(trades);
      if (deletePriorInsert) {
        const response = await deleteAndInsertTrades(
          payload,
          config,
          startBlock,
          endBlock
        );

        console.log(
          `filled ${startBlock}-${endBlock} [deleted: ${response.data[0].rowCount} inserted: ${response.data[1].rowCount}]`
        );
      } else {
        const response = await insertTrades(payload);
        console.log(
          `filled blocks: ${startBlock}-${endBlock} [inserted: ${response.rowCount}]`
        );
      }
    } else {
      console.log(`no events in ${startBlock}-${endBlock}`);
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
