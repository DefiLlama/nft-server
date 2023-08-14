const minify = require('pg-minify');

const { getMaxBlock } = require('../etype/trades/queries');
const { indexa } = require('../utils/dbConnection');

const insertWashTrades = async (start, stop) => {
  const query = minify(`
INSERT INTO ethereum.nft_wash_trades (transaction_hash, log_index)
WITH counted_trades AS (
    SELECT
        transaction_hash,
        log_index,
        buyer,
        seller,
        collection,
        token_id,
        COUNT(*) OVER (PARTITION BY seller, collection, token_id) AS seller_count,
        COUNT(*) OVER (PARTITION BY buyer, collection, token_id) AS buyer_count
    FROM
        ethereum.nft_trades as trades
    WHERE
        block_number BETWEEN $<start>
        AND $<stop>
        AND NOT EXISTS (
          SELECT 1
          FROM ethereum.nft_wash_trades as fake_trades
          WHERE fake_trades.transaction_hash = trades.transaction_hash
            AND fake_trades.log_index = trades.log_index
        )
)
SELECT DISTINCT
    transaction_hash,
    log_index
FROM
    counted_trades
LEFT JOIN
    ethereum.nft_collections nc ON counted_trades.collection = nc.collection
WHERE
    buyer = seller
    OR EXISTS (
        SELECT
            1
        FROM
            ethereum.nft_trades t
        WHERE
            t.seller = counted_trades.buyer
            AND t.buyer = counted_trades.seller
            AND t.collection = counted_trades.collection
            AND t.token_id = counted_trades.token_id
            AND t.transaction_hash <> counted_trades.transaction_hash
    )
    OR (
      (seller_count >= 3 OR buyer_count >= 3)
      AND token_standard = 'erc721'
  )
  `);

  const response = await indexa.result(query, { start, stop });

  if (!response) {
    return new Error(`Couldn't insert into ethereum.nft_wash_trades`, 404);
  }

  return response;
};

const job = async () => {
  // 30day window
  const days = 30;
  const blocksPerDay = 7200;
  const offset = blocksPerDay * days;

  const endBlock = await indexa.task(async (t) => {
    return await getMaxBlock(t, 'ethereum.nft_trades');
  });

  const startBlock = endBlock - offset;

  const response = await insertWashTrades(startBlock, endBlock);
  console.log(response);
};

module.exports = job;
