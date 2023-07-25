const yargs = require('yargs');

const { deleteAndInsertTransfers, deleteTransfers } = require('./queries');
const castTypes = require('../utils/castTypesTransfers');
const { indexa } = require('../utils/dbConnection');
const parseEvent = require('./parseEvent');

const argv = yargs.options({
  block: {
    alias: 'b',
    type: 'number',
    demandOption: true,
    describe:
      'min(block_number) - 1 from nft_transfers; we go backwards from that block',
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

let endBlock = argv.block;
const blockRange = argv.blockRange;
const blockStop = argv.blockStop;

(async () => {
  console.log(`==== Refill nft_transfers ====`);

  let startBlock = endBlock - blockRange;

  console.log(`starting refill from ${endBlock}...`);
  while (true) {
    const transfers = await indexa.task(async (t) => {
      return await parseEvent(t, startBlock, endBlock);
    });

    if (transfers.length) {
      const payload = castTypes(transfers);
      const response = await deleteAndInsertTransfers(
        payload,
        startBlock,
        endBlock
      );

      console.log(
        `filled ${startBlock}-${endBlock} [deleted: ${response.data[0].rowCount} inserted: ${response.data[1].rowCount}]`
      );
    } else {
      const response = await deleteTransfers(startBlock, endBlock);
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
