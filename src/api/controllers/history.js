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
    .json(response.map((c) => convertKeysToCamelCase(c)));
};

const getAllOnSale = async (req, res) => {
  const query = minify(`
-- get most recent row per contract_address, event_id where collection is not null (this is what we use
  -- for filling missing values)
  WITH most_recent_non_null AS (
      SELECT
          DISTINCT ON (contract_address, event_id) contract_address,
          event_id,
          collection,
          token_id
      FROM
          ethereum.nft_history
      WHERE
          collection IS NOT NULL
          AND token_id IS NOT NULL
          AND event_id IS NOT NULL
      ORDER BY
          contract_address,
          event_id,
          block_number DESC,
          log_index DESC
  ),
  -- using the above to fill nft_history
  nft_history_filled AS (
      SELECT
          h.transaction_hash,
          h.log_index,
          h.contract_address,
          h.topic_0,
          h.block_time,
          h.block_number,
          h.exchange_name,
          h.event_type,
          h.price,
          h.eth_price,
          h.usd_price,
          h.currency_address,
          h.user_address,
          h.event_id,
          h.expiration,
          COALESCE(h.collection, m.collection) AS collection,
          COALESCE(h.token_id, m.token_id) AS token_id
      FROM
          ethereum.nft_history h
          LEFT JOIN most_recent_non_null m ON h.contract_address = m.contract_address
          AND h.event_id = m.event_id
  ),
  -- return the most recent entry per collection, token_id
  most_recent AS (
      SELECT
          DISTINCT ON (collection, token_id) *
      FROM
          nft_history_filled
      ORDER BY
          collection,
          token_id,
          block_number DESC,
          log_index DESC
  ),
  -- remove rows in history if trades contains a sale even with block_number >= the last entry from history
  filtered AS (
      SELECT
          *
      FROM
          most_recent h
      WHERE
          NOT EXISTS (
              SELECT
                  1
              FROM
                  ethereum.nft_trades t
              WHERE
                  -- the date filter is temporary, (nft_trades > 50mil entries)
                  t.block_time >= CURRENT_DATE - INTERVAL '90 day'
                  AND t.collection = h.collection
                  AND t.token_id = h.token_id
                  AND t.block_number >= h.block_number
          )
  ),
  -- remove rows with event_types from which we can infer that the nft isn't listed anylonger (eg AuctionCanceled)
  -- remove rows with collections which aren't 1/1
  final AS (
      SELECT
          *
      FROM
          filtered
  )
    SELECT
        encode(transaction_hash, 'hex') AS transaction_hash,
        log_index,
        encode(contract_address, 'hex') AS contract_address,
        encode(topic_0, 'hex') AS topic_0,
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
        expiration,
        encode(collection, 'hex') AS collection,
        encode(token_id, 'hex') AS token_id
    FROM
        final
    WHERE
        event_type NOT IN ($<event_type_exclusion:csv>)
    LIMIT 10
      `);

  // if the last event is of event_type from this list then we remove it
  // ->  delisted
  const excludeEventType = {
    foundation: ['BuyPriceCanceled', 'ReserveAuctionCanceled'],
    'knownorigin-KODAV3PrimaryMarketplace': ['BuyNowDeListed'],
    'knownorigin-KODAV3SecondaryMarketplace': ['TokenDeListed'],
    'knownorigin-TokenMarketplaceV2': ['TokenDeListed'],
    'manifold-v1': ['CancelListing'],
    'manifold-v2': ['CancelListing'],
    'opensea-SaleClockAuction': ['AuctionCancelled'],
    'superrare-Multi': ['CancelAuction'],
    'superrare-SuperRareBazaar': ['CancelAuction'],
    'zora-AuctionHouse': ['AuctionCanceled'],
  };

  const response = await indexa.query(query, {
    event_type_exclusion: [...new Set(Object.values(excludeEventType).flat())],
  });

  if (!response) {
    return new Error(`Couldn't get data`, 404);
  }

  res
    .set(customHeaderFixedCache(3600))
    .status(200)
    .json(response.map((c) => convertKeysToCamelCase(c)));
};

module.exports = {
  getHistory,
  getAllOnSale,
};
