const yargs = require('yargs');

const parseEvent = require('../utils/parseEvent');
const getMaxBlock = require('../controllers/common');
const { blockRangeTest } = require('../utils/params');

const argv = yargs.options({
  marketplace: {
    type: 'string',
    demandOption: true,
    describe: 'adapter name, eg blur',
  },
}).argv;

(async () => {
  const marketplace = argv.marketplace;
  console.log(`==== Testing ${marketplace} ====`);

  const time = () => Date.now() / 1000;
  const start = time();

  const { abi, config, parse } = require(`../adapters/${marketplace}`);

  const endBlock = await getMaxBlock('indexa', 'ethereum.event_logs');

  const startBlock = !process.argv[3]
    ? endBlock - blockRangeTest
    : endBlock - process.argv[3];

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
