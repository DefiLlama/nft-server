const minify = require('pg-minify');

const checkCollection = require('../../utils/checkAddress');
const { convertKeysToCamelCase } = require('../../utils/keyConversion');
const { customHeaderFixedCache } = require('../../utils/customHeader');
const { indexa } = require('../../utils/dbConnection');

const getTransfers = async (req, res) => {
  let { collectionId, tokenId, excludeSales } = req.query;
  if (!collectionId || !tokenId || !checkCollection(collectionId))
    return res.status(400).json('invalid collectionId/tokenId!');

  // artblocks
  if (collectionId.includes(':')) {
    collectionId = collectionId.split(':')[0];
  }

  const query = minify(`
  SELECT
    encode(t.transaction_hash, 'hex') AS transaction_hash,
    t.log_index,
    t.block_time,
    t.block_number,
    encode(t.from_address, 'hex') AS from_address,
    encode(t.to_address, 'hex') AS to_address,
    t.amount
  FROM
    ethereum.nft_transfers AS t
  WHERE
    t.collection = $<collectionId>
    AND t.token_id = $<tokenId>
    ${
      excludeSales
        ? 'AND NOT EXISTS (SELECT 1 FROM ethereum.nft_trades AS trades WHERE trades.collection = $<collectionId> AND trades.token_id = $<tokenId> AND trades.transaction_hash = t.transaction_hash)'
        : ''
    }
    `);

  const response = await indexa.query(query, {
    collectionId: `\\${collectionId.slice(1)}`,
    tokenId,
  });

  if (!response) {
    return new Error(`Couldn't get data`, 404);
  }

  res
    .set(customHeaderFixedCache(300))
    .status(200)
    .json(response.map((c) => convertKeysToCamelCase(c)));
};

module.exports = {
  getTransfers,
};
