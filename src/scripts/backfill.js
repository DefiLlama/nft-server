const yargs = require('yargs');

const {
  deleteAndInsertTrades,
  insertTrades,
} = require('../controllers/nftTrades');
const parseEvent = require('../utils/parseEvent');
const castTypes = require('../utils/castTypes');
const { blockRange } = require('../utils/params');

const argv = yargs.options({
  marketplace: {
    type: 'string',
    demandOption: true,
    describe: 'adapter name, eg blur',
  },
  block: {
    type: 'number',
    demandOption: true,
    describe:
      'min(block_number) - 1 from nft_trades; we go backwards from that block',
  },
  deletePriorInsert: {
    type: 'boolean',
    demandOption: false,
    describe:
      'set to true if we already have old data for this adapter. this will delete any rows in the table prior to insertion. leave empty if not (no need to run a delete statement)',
  },
}).argv;

const marketplace = argv.marketplace;
let endBlock = argv.block;
const deletePriorInsert = argv.deletePriorInsert;

const main = async () => {
  console.log(`==== Refill ${marketplace} ====`);

  const { abi, config, parse } = require(`../adapters/${marketplace}`);
  let startBlock = endBlock - blockRange;

  console.log(`starting refill from ${endBlock}...`);
  while (true) {
    const trades = await parseEvent(startBlock, endBlock, abi, config, parse);
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
        `filled ${startBlock}-${endBlock} [inserted: ${response.rowCount}]`
      );
    }

    // update blocks
    endBlock = startBlock - 1; // query is inclusive
    startBlock = endBlock - blockRange;
  }
};

(async () => {
  await main();
})();
