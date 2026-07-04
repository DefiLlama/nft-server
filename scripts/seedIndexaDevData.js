// Populates the local dev `indexa` (ethereum schema) with one real,
// correctly ABI-encoded sale event per configured marketplace, so that
// `node src/adapters/test.js --etype=trades --marketplace=<name>` produces
// actual parsed output on a fresh dev environment.
//
// This directly addresses the blocker raised in issue #12: the maintainers'
// own event_logs table is fed by a private indexer they don't control, so a
// literal "create the table" migration leaves it empty and the test command
// still can't produce anything. Instead of replicating that indexer, this
// generates syntactically-valid raw log rows that decode correctly through
// each adapter's real ABI + parse() function — enough to verify parsing
// logic end-to-end locally.
//
// Usage: npm run seed:indexa
const crypto = require('crypto');
const ethers = require('ethers');
const { indexa } = require('../src/utils/dbConnection');

const randomHex = (numBytes) => '0x' + crypto.randomBytes(numBytes).toString('hex');
const toBytea = (hex) => Buffer.from(hex.replace(/^0x/, ''), 'hex');

const ETH_PRICE_USD = 3000;
const BLOCK_NUMBER = 18000000;
const BLOCK_TIME = new Date();

// One seed definition per adapter we know how to fabricate a valid event for.
// Add more entries here as coverage grows.
const seeds = [
  {
    marketplace: 'blur-v1',
    build: () => {
      const abi = require('../src/adapters/blur-v1/abi.json');
      const config = require('../src/adapters/blur-v1/config.json');
      const iface = new ethers.Interface(abi);

      const seller = randomHex(20);
      const buyer = randomHex(20);
      const collection = randomHex(20);
      const paymentToken = ethers.ZeroAddress; // ETH
      const price = ethers.parseEther('1.5');
      const tokenId = 1234n;

      const feeStruct = [250, randomHex(20)]; // 2.5% royalty to a random recipient

      // Order struct order must match the ABI's tuple component order exactly:
      // trader, side, matchingPolicy, collection, tokenId, amount, paymentToken,
      // price, listingTime, expirationTime, fees[], salt, extraParams
      const sellOrder = [
        seller,
        1, // Side.Sell
        randomHex(20), // matchingPolicy
        collection,
        tokenId,
        1n, // amount
        paymentToken,
        price,
        BigInt(Math.floor(Date.now() / 1000) - 3600),
        BigInt(Math.floor(Date.now() / 1000) + 3600),
        [feeStruct],
        1n, // salt
        '0x',
      ];
      const buyOrder = [
        buyer,
        0, // Side.Buy
        randomHex(20),
        collection,
        tokenId,
        1n,
        paymentToken,
        price,
        BigInt(Math.floor(Date.now() / 1000) - 3600),
        BigInt(Math.floor(Date.now() / 1000) + 3600),
        [],
        2n,
        '0x',
      ];

      const { data, topics } = iface.encodeEventLog('OrdersMatched', [
        seller, // maker (indexed)
        buyer, // taker (indexed)
        sellOrder,
        randomHex(32), // sellHash
        buyOrder,
        randomHex(32), // buyHash
      ]);

      return {
        contract: config.contracts[0],
        topics,
        data,
      };
    },
  },
];

(async () => {
  for (const seed of seeds) {
    const { contract, topics, data } = seed.build();
    const txHash = randomHex(32);
    const blockHash = randomHex(32);

    await indexa.none(
      `INSERT INTO ethereum.event_logs
        (transaction_hash, log_index, contract_address, topic_0, topic_1, topic_2, topic_3, data, block_time, block_number, block_hash)
       VALUES ($1, 0, $2, $3, $4, $5, $6, $7, $8, $9, $10)
       ON CONFLICT (transaction_hash, log_index) DO NOTHING`,
      [
        toBytea(txHash),
        toBytea(contract),
        toBytea(topics[0]),
        topics[1] ? toBytea(topics[1]) : null,
        topics[2] ? toBytea(topics[2]) : null,
        topics[3] ? toBytea(topics[3]) : null,
        toBytea(data),
        BLOCK_TIME,
        BLOCK_NUMBER,
        toBytea(blockHash),
      ]
    );

    await indexa.none(
      `INSERT INTO ethereum.blocks (time, number, price) VALUES ($1, $2, $3)
       ON CONFLICT (time) DO NOTHING`,
      [BLOCK_TIME, BLOCK_NUMBER, ETH_PRICE_USD]
    );

    await indexa.none(
      `INSERT INTO ethereum.transactions (hash, from_address, to_address, data) VALUES ($1, $2, $3, $4)
       ON CONFLICT (hash) DO NOTHING`,
      [toBytea(txHash), toBytea(randomHex(20)), toBytea(contract), toBytea('0x')]
    );

    console.log(`seeded 1 ${seed.marketplace} trade event (tx ${txHash})`);
  }

  process.exit(0);
})().catch((err) => {
  console.error('seed failed:', err);
  process.exit(1);
});
