const yargs = require('yargs');

const { getMaxBlock } = require('../trades/queries');
const { blockRangeTest } = require('../../utils/params');
const { indexa } = require('../../utils/dbConnection');
const parseEvent = require('./parseEvent');

const argv = yargs.options({
  block: {
    alias: 'b',
    type: 'number',
    demandOption: false,
  },
  blockRange: {
    alias: 'r',
    type: 'number',
    demandOption: false,
  },
  txHash: {
    alias: 'h',
    type: 'string',
    demandOption: false,
    describe: 'transaction_hash',
  },
}).argv;

(async () => {
  const block = argv.block;
  const blockRange = argv.blockRange;
  const txHash = argv.txHash;

  console.log(`==== Testing nft_transfers parsing ====`);

  const time = () => Date.now() / 1000;
  const start = time();

  const endBlock = !block
    ? await indexa.task(async (t) => {
        return await getMaxBlock(t, 'ethereum.event_logs');
      })
    : block;

  const startBlock = endBlock - (blockRange ?? blockRangeTest);

  const transfers = await indexa.task(async (t) => {
    return await parseEvent(t, startBlock, endBlock);
  });

  console.log(transfers);
  console.log(`\nRuntime: ${(time() - start).toFixed(2)} sec`);
  console.log(
    `${transfers.length} transfers in blocks ${startBlock}-${endBlock}`
  );

  if (txHash) {
    console.log('\nresult for txHash:');
    console.log(
      transfers.filter((e) => e.transaction_hash === txHash.replace('0x', ''))
    );
  }

  process.exit(0);
})();
