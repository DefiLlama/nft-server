const minify = require('pg-minify');

const checkCollection = require('../../utils/checkAddress');
const { convertKeysToCamelCase } = require('../../utils/keyConversion');
const { customHeaderFixedCache } = require('../../utils/customHeader');
const { indexa } = require('../../utils/dbConnection');

const getHistory = async (req, res) => {
  let { collectionId, tokenId } = req.query;
  if (!collectionId || !tokenId || !checkCollection(collectionId))
    return res.status(400).json('invalid collectionId/tokenId!');

  // artblocks
  if (collectionId.includes(':')) {
    collectionId = collectionId.split(':')[0];
  }

  const query = minify(`
  SELECT
    encode(h.transaction_hash, 'hex') AS transaction_hash,
    h.log_index,
    h.block_time,
    h.block_number,
    encode(h.exchange_name, 'escape') AS exchange_name,
    encode(h.event_type, 'escape') AS event_type,
    h.price,
    h.eth_price,
    h.usd_price,
    encode(h.currency_address, 'hex') AS currency_address,
    encode(h.event_id, 'escape') AS event_id,
    expiration
  FROM
    ethereum.nft_history AS h
  WHERE
    h.collection = $<collectionId>
    AND h.token_id = $<tokenId>
  ORDER BY
    h.block_number DESC
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
  getHistory,
};
