const yargs = require('yargs');

const parseEvent = require('./parseEvent');
const { getMaxBlock } = require('../controllers/nftTrades');
const { blockRangeTest } = require('../utils/params');
const { connect } = require('../utils/dbConnection');

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
}).argv;

(async () => {
  const marketplace = argv.marketplace;
  const block = argv.block;
  const blockRange = argv.blockRange;

  console.log(`==== Testing ${marketplace} ====`);

  const time = () => Date.now() / 1000;
  const start = time();

  const { abi, config, parse } = require(`../adapters/${marketplace}`);

  const conn = await connect('indexa');
  const endBlock = !block
    ? await conn.task(async (t) => {
        return await getMaxBlock(t, 'ethereum.event_logs');
      })
    : block;

  const startBlock = endBlock - (blockRange ?? blockRangeTest);

  const trades = await conn.task(async (t) => {
    return await parseEvent(t, startBlock, endBlock, abi, config, parse);
  });

  console.log(trades);
  console.log(`\nRuntime: ${(time() - start).toFixed(2)} sec`);
  console.log(`${trades.length} trades in blocks ${startBlock}-${endBlock}`);

  process.exit(0);
})();
