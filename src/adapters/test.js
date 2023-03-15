const yargs = require('yargs');

const parseEvent = require('./parseEvent');
const { getMaxBlock } = require('../controllers/nftTrades');
const { blockRangeTest } = require('../utils/params');

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
}).argv;

(async () => {
  const marketplace = argv.marketplace;
  const block = argv.block;
  console.log(`==== Testing ${marketplace} ====`);

  const time = () => Date.now() / 1000;
  const start = time();

  const { abi, config, parse } = require(`../adapters/${marketplace}`);

  const endBlock = !block ? await getMaxBlock('ethereum.event_logs') : block;

  const startBlock = endBlock - blockRangeTest;

  const trades = await parseEvent(
    startBlock,
    endBlock,
    abi,
    config,
    parse,
    true
  );

  console.log(`\nRuntime: ${(time() - start).toFixed(2)} sec`);
  console.log(trades);

  process.exit(0);
})();
