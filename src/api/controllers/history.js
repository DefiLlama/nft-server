const minify = require('pg-minify');

const { checkCollection } = require('../../utils/checkAddress');
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

// if the last event is of event_type from this list then we remove it
// ->  delisted
const excludeEventType = {
  foundation: ['ReserveAuctionCanceled'],
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

const oneOfoneExchanges = [
  'foundation',
  'superrare',
  'zora',
  'knownorigin',
  'makersplace',
  'manifold',
  'rarible',
];

const getAvailable = async (req, res) => {
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
collection_is_null AS (
    SELECT
        *
    FROM
        ethereum.nft_history
    WHERE
        collection IS NULL
        AND token_id IS NULL
),
nft_history_filled AS (
    SELECT
        t.contract_address,
        t.event_id,
        t.event_type,
        t.block_number,
        t.log_index,
        COALESCE(t.collection, m.collection) AS collection,
        COALESCE(t.token_id, m.token_id) AS token_id
    FROM
        collection_is_null t
        LEFT JOIN most_recent_non_null m ON t.contract_address = m.contract_address
        AND t.event_id = m.event_id
    UNION
    ALL
    SELECT
        contract_address,
        event_id,
        event_type,
        block_number,
        log_index,
        collection,
        token_id
    FROM
        ethereum.nft_history
    WHERE
        collection IS NOT NULL
        AND token_id IS NOT NULL
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
) 
-- remove rows in history if trades contains a sale event with block_number >= the last entry from history
-- remove rows with event_types from which we can infer that the nft isn't listed anylonger (eg AuctionCanceled)
-- remove rows with collections which aren't 1/1
SELECT
    encode(collection, 'hex') AS collection,
    encode(token_id, 'escape') AS token_id
FROM
    most_recent h
WHERE
    NOT EXISTS (
        SELECT
            1
        FROM
            ethereum.nft_trades t
        WHERE
            exchange_name IN ($<oneOfoneExchanges:csv>)
            AND t.collection = h.collection
            AND t.token_id = h.token_id
            AND t.block_number >= h.block_number
    )
    AND event_type NOT IN ($<exclude:csv>)
`);

  let response = await indexa.query(query, {
    exclude: [...new Set(Object.values(excludeEventType).flat())],
    oneOfoneExchanges,
  });

  if (!response) {
    return new Error(`Couldn't get data`, 404);
  }

  response = response.reduce((acc, obj) => {
    const { collection, token_id } = obj;
    if (!acc[collection]) {
      acc[collection] = [];
    }
    acc[collection].push(token_id);
    return acc;
  }, {});

  res.set(customHeaderFixedCache(3600)).status(200).json(response);
};

const getAvailable2 = async (req, res) => {
  const query = minify(`
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
collection_is_null AS (
    SELECT
        *
    FROM
        ethereum.nft_history
    WHERE
        collection IS NULL
        AND token_id IS NULL
),
nft_history_filled AS (
    SELECT
        t.contract_address,
        t.event_id,
        t.event_type,
        t.block_number,
        t.log_index,
        COALESCE(t.collection, m.collection) AS collection,
        COALESCE(t.token_id, m.token_id) AS token_id,
        t.eth_price,
        t.user_address,
        t.transaction_hash,
        t.exchange_name
    FROM
        collection_is_null t
        LEFT JOIN most_recent_non_null m ON t.contract_address = m.contract_address
        AND t.event_id = m.event_id
    UNION
    ALL
    SELECT
        contract_address,
        event_id,
        event_type,
        block_number,
        log_index,
        collection,
        token_id,
        eth_price,
        user_address,
        transaction_hash,
        exchange_name
    FROM
        ethereum.nft_history
    WHERE
        collection IS NOT NULL
        AND token_id IS NOT NULL
),
available_only AS (
    SELECT
        encode(collection, 'hex') AS collection,
        encode(token_id, 'escape') AS token_id,
        encode(event_type, 'escape') AS event_type,
        encode(user_address, 'hex') AS user_address,
        eth_price,
        block_number
    FROM
        nft_history_filled h
    WHERE
-- limiting output to auctions for now
    event_type IN (
  'ReserveAuctionCreated',
  'ReserveAuctionUpdated',
  'CreateLinearDutchAuction',
  'NewAuction',
  'ListedForReserveAuction',
  'ReservePriceUpdated',
  'AuctionCreated',
  'AuctionReservePriceUpdated',
  'CreateListing',
  'CreateListingTokenDetails',
  'ModifyListing'
    )
        AND NOT EXISTS (
            SELECT
                1
            FROM
                ethereum.nft_trades t
            WHERE
                exchange_name IN ($<oneOfoneExchanges:csv>)
                AND t.collection = h.collection
                AND t.token_id = h.token_id
                AND t.block_number >= h.block_number
        )
        AND h.event_type NOT IN ($<exclude:csv>)
    ORDER BY
        h.collection,
        h.token_id,
        h.block_number DESC
)
SELECT
    *
FROM
    available_only
`);

  let response = await indexa.query(query, {
    exclude: [...new Set(Object.values(excludeEventType).flat())],
    oneOfoneExchanges,
  });

  if (!response) {
    return new Error(`Couldn't get data`, 404);
  }

  res
    .set(customHeaderFixedCache(3600))
    .status(200)
    .json(
      response.map((e) => [
        e.collection,
        e.token_id,
        e.event_type,
        e.user_address,
        e.eth_price,
        e.block_number,
      ])
    );
};

module.exports = {
  getHistory,
  getAvailable,
  getAvailable2,
};
