const yargs = require('yargs');

const { getMaxBlock } = require('./queries');
const { blockRangeTest } = require('../../utils/params');
const { indexa } = require('../../utils/dbConnection');

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
  const marketplace = argv.marketplace;
  const block = argv.block;
  const blockRange = argv.blockRange;
  const txHash = argv.txHash;

  console.log(`==== Testing ${marketplace} ====`);

  const time = () => Date.now() / 1000;
  const start = time();

  const { abi, config, parse } = require(`../trades/${marketplace}`);

  const parseEvent =
    config.version === 'wyvern'
      ? require('./parseEventWyvern')
      : require('./parseEvent');

  const endBlock = !block
    ? await indexa.task(async (t) => {
        return await getMaxBlock(t, 'ethereum.event_logs');
      })
    : block;

  const startBlock = endBlock - (blockRange ?? blockRangeTest);

  const trades = await indexa.task(async (t) => {
    return await parseEvent(t, startBlock, endBlock, abi, config, parse);
  });

  console.log(trades);
  console.log(`\nRuntime: ${(time() - start).toFixed(2)} sec`);
  console.log(`${trades.length} trades in blocks ${startBlock}-${endBlock}`);

  if (txHash) {
    console.log('\nresult for txHash:');
    console.log(
      trades.filter((e) => e.transaction_hash === txHash.replace('0x', ''))
    );
  }

  process.exit(0);
})();
