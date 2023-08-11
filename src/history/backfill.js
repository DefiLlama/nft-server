const yargs = require('yargs');

const { deleteAndInsertHistory, deleteHistory } = require('./queries');
const castTypes = require('../utils/castTypesHistory');
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
  blockStop: {
    alias: 's',
    type: 'number',
    demandOption: false,
    describe: 'block at which backfill will stop',
  },
}).argv;

const marketplace = argv.marketplace;
let endBlock = argv.block;
const blockRange = argv.blockRange;
const blockStop = argv.blockStop;

(async () => {
  console.log(`==== Refill ${marketplace} ====`);

  const { abi, config, parse } = require(`../history/${marketplace}`);
  const parseEvent = require('./parseEvent');

  let startBlock = endBlock - blockRange;

  console.log(`starting refill from ${endBlock}...`);
  while (true) {
    const history = await indexa.task(async (t) => {
      return await parseEvent(t, startBlock, endBlock, abi, config, parse);
    });

    if (history.length) {
      const payload = castTypes(history);
      const response = await deleteAndInsertHistory(
        payload,
        config,
        startBlock,
        endBlock
      );

      console.log(
        `filled ${startBlock}-${endBlock} [deleted: ${response.data[0].rowCount} inserted: ${response.data[1].rowCount}]`
      );
    } else {
      const response = await deleteHistory(config, startBlock, endBlock);
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
