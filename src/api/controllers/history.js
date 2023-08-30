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
  WITH _uniq AS (
    SELECT
        DISTINCT contract_address,
        event_id
    FROM
        ethereum.nft_history
    WHERE
        collection = $<collectionId>
        AND token_id = $<tokenId>
),
combined AS (
    SELECT
        *
    FROM
        ethereum.nft_history
    WHERE
        collection = $<collectionId>
        AND token_id = $<tokenId>
    UNION
    SELECT
        h.*
    FROM
        ethereum.nft_history AS h
        JOIN _uniq u ON h.contract_address = u.contract_address
        AND h.event_id = u.event_id
)
SELECT
    encode(transaction_hash, 'hex') AS transaction_hash,
    log_index,
    block_time,
    block_number,
    encode(exchange_name, 'escape') AS exchange_name,
    encode(event_type, 'escape') AS event_type,
    price,
    eth_price,
    usd_price,
    encode(currency_address, 'hex') AS currency_address,
    encode(user_address, 'hex') AS user_address,
    encode(event_id, 'escape') AS event_id,
    expiration
FROM
    combined
ORDER BY
    block_number DESC;
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
    .json(
      response
        .sort(
          (a, b) => b.block_time - a.block_time || b.log_index - a.log_index
        )
        .map((c) => convertKeysToCamelCase(c))
    );
};

module.exports = {
  getHistory,
};
