const insertTrades = require('../controllers/nftTrades');
const parseEvent = require('../utils/parseEvent');
const castTypes = require('../utils/castTypes');
const { blockRange } = require('../utils/params');

const main = async () => {
  const marketplace = process.argv[2];
  const { abi, config, parse } = require(`../adapters/${marketplace}`);

  // arg = the first missing block
  let endBlock = process.argv[3];
  let startBlock = endBlock - blockRange;

  while (true) {
    const trades = await parseEvent(startBlock, endBlock, abi, config, parse);
    await insertTrades(castTypes(trades));
    console.log(`filled ${startBlock}-${endBlock}`);
    endBlock = startBlock - 1; // query is inclusive
    startBlock = endBlock - blockRange;
  }
};

(async () => {
  await main();
})();
