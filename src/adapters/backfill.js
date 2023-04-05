const yargs = require('yargs');

const {
  deleteAndInsertTrades,
  insertTrades,
} = require('../controllers/nftTrades');
const parseEvent = require('./parseEvent');
const castTypes = require('../utils/castTypes');

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
    type: 'boolean',
    demandOption: false,
    describe:
      'set to true if we already have old data for this adapter. this will delete any rows in the table prior to insertion. leave empty if not (no need to run a delete statement)',
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
const deletePriorInsert = argv.deletePriorInsert;
const blockRange = argv.blockRange;
const blockStop = argv.blockStop;

const main = async () => {
  console.log(`==== Refill ${marketplace} ====`);

  const { abi, config, parse } = require(`../adapters/${marketplace}`);
  let startBlock = endBlock - blockRange;

  console.log(`starting refill from ${endBlock}...`);
  while (true) {
    const trades = await parseEvent(startBlock, endBlock, abi, config, parse);

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
};

(async () => {
  await main();
})();
