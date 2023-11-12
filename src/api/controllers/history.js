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
    block_number DESC,
    log_index DESC;
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

const oneOfoneExchanges = [
  'foundation',
  'superrare',
  'zora',
  'knownorigin',
  'makersplace',
  'manifold',
  'rarible',
  'sealed',
];

// generally:
// - we wont track auction listings for makersplace (auctions are off chain and from bids we can't establish if auction has started or not)
// - we wont track started auctions for known origin (bids can be under reserve price)
// - opensea buy now/auctions are ignored
const excludePriorLastEvent = {
  foundation: {
    prior: [
      // OfferMade
      '0x00ce0a712e4e277ac7b34942865f0de7a5629dffe0539b70423ad5ff1ed6ab42',
      // BuyPriceCanceled
      '0x70c7877531c04c7d9caa8a7eca127384f04e8a6ee58b63f778ce5401d8bcae41',
      // BuyPriceSet
      '0xfcc77ea8bdcce862f43b7fb00fe6b0eb90d6aeead27d3800d9257cf7a05f9d96',
    ],
    end: [
      // ReserveAuctionCanceled
      '0x14b9c40404d5b41deb481f9a40b8aeb2bf4b47679b38cf757075a66ed510f7f1',
      // BuyPriceCanceled
      '0x70c7877531c04c7d9caa8a7eca127384f04e8a6ee58b63f778ce5401d8bcae41',
      // BuyPriceInvalidated (eg for auction with buy now listing: when
      // a bid comes in it starts the auction and emits a BuyPriceInvalidated)
      // and the order is -> BuyPriceInvalidated -> ReserveAuctionBidPlaced, so
      // the last event in history won't ever be BuyPriceInvalidated. However,
      // in foundations case we want to read both reserve price and buy now price
      // if available. hence we need to add BuyPriceInvalidated and remove any such events
      // at the end
      '0xaa6271d89a385571e237d3e7254ccc7c09f68055e6e9b410ed08233a8b9a05cf',
    ],
  },
  superrare: {
    prior: [
      // OfferPlaced
      '0xacbe96367816f728b84abf006ca777225b704072592132845e9a3dbd7b023691',
      // CancelOffer
      '0xb9a071fe7d38dc86fbc448d440311b6bd67e5e09de8b1b62c72f5fe344100453',
      // Bid
      '0x19421268847f42dd61705778018ddfc43bcdce8517e7a630acb12f122c709481',
      // CancelBid
      '0x09dcebe16a733e22cc47e4959c50d4f21624d9f1815db32c2e439fbbd7b3eda0',
      // Bid
      '0xd21fbaad97462831ad0c216f300fefb33a10b03bb18bb70ed668562e88d15d53',
      // CancelBid
      '0x99a3761c98d7a0c3980cbeb3d8009b315a463f8020b43ca1e6901611b06547f9',
    ],
    end: [
      // CancelAuction
      '0x26d4510b556e779d6507640413e013206e44c8f5d018c7c74ed8926f3f024a9c',
    ],
  },
  makersplace: {
    // note: makersplace auctions are off-chain, hence ignoring TokenBid related events.
    prior: [
      // TokenBidCreatedEvent
      '0x9525a453a215f02f1c5afee7ab8628c140dfa606cd034605e34b8850f2f6ef20',
      // TokenBidRemovedEvent
      '0xf6b89ca1bccc679695ae3b928ee8c9335ecdfd739853cfe9e209a13e40cfacc0',
    ],
    // same for bidPH
    end: [
      // SaleCanceledEvent
      '0xa50b2d6faf84e88de164f615bc8daa8477ab67f677d72aef3a3122d26c6eae28',
    ],
  },
  zora: {
    prior: [
      // BidCreated
      '0x327bc9021bfbee403a11b13dd6c819999006aff090cc129f07e9f2840af38dd5',
      // BidRemoved
      '0xcbebd567b8a5c57f63ec61dc46746aab28daff6bdd1f4a6a0a305c17fa5465c9',
    ],
    end: [
      // AskCanceled
      '0x871956abf85befb7c955eacd40fcabe7e01b1702d75764bf7f54bf481933fd35',
      // AskRemoved
      '0xbf58f6d6c7d7c6efc69e7444efa93ed26d7cdc0e82e12a37df96f36a367561df',
      // AuctionCancelled
      '0x6091afcbe8514686c43b167ca4f1b03e24446d29d8490d496e438f8a2c763439',
    ],
  },
  knownorigin: {
    prior: [
      // --- auction related:
      // on knoworigin bids can be below the reserve price (we won't track
      // started auctions)
      // BidPlacedOnReserveAuction
      '0x0dacabc07ffe733bf314aba914422a6efa538ba8f6885bbd1ee3275c3b3f389d',
      // BidWithdrawnFromReserveAuction
      '0xd1d72c9a0832cf3726713b61a67a8f1656cc01385640d04f1155b000d1b7b751',
      // --- offers:
      // TokenBidPlaced
      '0xefb62db28a02134884fb028815b1bafb7dd0f1251e8a595ea94c3b4180f954de',
      // TokenBidWithdrawn
      '0xc8ba6fa570e0742f98985499c36c47fe428ca4547a07e7e2e6991cc11e4817cc',
      // BidPlaced
      '0x3d87e1d02e187b9fe1095bc12567b7485b6cf54c47eea3dc9b5fd64d03cb6750',
      // BidWithdrawn
      '0x5e9c7ae3229b2cda5065d7058fcc05765c695c29ce05313fbe96cb2ca639231a',
      // BidRejected
      '0x6d699e170cc72516120ba19fe48e744504798d1afc2ffb65ff1154a6f4fa4d15',
    ],
    end: [
      // BuyNowDeListed
      '0x782c030e02c4ea624a3fb427d8dd4f1023dd5f0d944aa3d14a715628e1e41c7b',
      // TokenDeListed
      '0x6caa49919a8c0059b871ec5c8b81a13a285b53cd92216d310fcdcf9c893e5a45',
      // ConvertFromBuyNowToOffers
      '0xc5cede647bcf791d83ff0ee63bb8ae1434f9795878081f8ad4b36ee1cb582aad',
      //  ReserveAuctionConvertedToOffers
      '0x5ad253cc2bfa6797b2f1b2a45aa1b0e961d3c6ff8090cc72122c1745d3e84101',
    ],
  },
  manifold: {
    prior: [
      // RescindOfferEvent
      '0x3d13f7b5271fd88ba34bfa097c4b522a61f0cfeb1621d43bfae01034fa421e4f',
      // OfferEvent
      '0x73535bde202cd31a2fe12c1b9e7903a1b273e46e0dbc7d55dc586af898543701',
      // CreateListingTokenDetails (manifold has both CreateListing and CreateListingTokenDetails;
      // on listing creation both events are emitted, first CreateListing with all details except
      // collection, token_id). we omit this event cause we fill CreateListing with missing info from
      // CreateListingTokenDetails
      '0xf560c51209e077c5824d9fa05788bec442ed7b4033815e855d0906c6a713a7f5',
      '0xc43fa59bf811b406292f853c5888b214b0e868c12884ca93b4956648caa6938a',
    ],
    end: [
      // CancelListing
      '0xe94376722784941abde69f1253384e4c041ea529a112b8378ad63f829124ad11',
      '0x19ef8c897f0ad4be12bac96be8f4a3984059ae9566f02163b0e48cf00f9aa338',
    ],
  },
  sealed: {
    prior: [],
    end: [
      // AuctionCancelled
      '0xd88fab4b08bf76f15cf2d6e03e382acf1edd6790ab82967e406abac37db20288',
    ],
  },
};

const availableBase = `
WITH history AS (
  SELECT
      *
  FROM
      ethereum.nft_history
  WHERE
      exchange_name != 'opensea'
),
-- fill collection, token_id based on event_id where necessary
-- (eg some events such as auction bids on foundation do not include collection, token_id but an auction id)
most_recent_non_null AS (
  SELECT
      DISTINCT ON (contract_address, event_id) contract_address,
      event_id,
      collection,
      token_id
  FROM
      history
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
      history
  WHERE
      collection IS NULL
      AND token_id IS NULL
),
history_filled AS (
  SELECT
      t.contract_address,
      t.event_id,
      t.event_type,
      t.block_time,
      t.log_index,
      COALESCE(t.collection, m.collection) AS collection,
      COALESCE(t.token_id, m.token_id) AS token_id,
      t.eth_price,
      t.user_address,
      t.transaction_hash,
      t.exchange_name,
      t.topic_0
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
      block_time,
      log_index,
      collection,
      token_id,
      eth_price,
      user_address,
      transaction_hash,
      exchange_name,
      topic_0
  FROM
      history
  WHERE
      collection IS NOT NULL
      AND token_id IS NOT NULL
),
-- get the last event (excludes anything in 'WHERE topic_0 NOT IN' prior to DISTINCT ON operation)
-- this is important cause rn we don't want the last eg offer,
-- but the last reserve_price/buy_now_price/bid_price
last_event AS (
  SELECT
      DISTINCT ON (collection, token_id) *
  FROM
      history_filled
  WHERE
      topic_0 NOT IN ($<excludePrior:csv>)
  ORDER BY
      collection,
      token_id,
      block_time DESC,
      log_index DESC
)
`;

const getAvailable = async (req, res) => {
  const query =
    availableBase +
    `,
last_event_foundation_buy_now AS (
  SELECT
      DISTINCT ON (collection, token_id) *
  FROM
      history_filled
  WHERE
      exchange_name = 'foundation'
      -- filter to 'buy now' related events only
      AND event_type IN (
          'BuyPriceSet',
          'BuyPriceCanceled',
          'BuyPriceInvalidated'
      )
  ORDER BY
      collection,
      token_id,
      block_time DESC,
      log_index DESC
),
-- union (remove dupes, if any)
last_event_combined AS (
  SELECT
      *
  FROM
      last_event
  UNION
  SELECT
      *
  FROM
      last_event_foundation_buy_now
)
SELECT
    encode(collection, 'hex') AS collection,
    encode(token_id, 'escape') AS token_id,
    encode(event_type, 'escape') AS event_type,
    encode(user_address, 'hex') AS user_address,
    eth_price,
    block_time
FROM
    last_event_combined l
WHERE
    NOT EXISTS (
        SELECT
            1
        FROM
            ethereum.nft_trades t
        WHERE
            exchange_name IN ($<oneOfoneExchanges:csv>)
            AND t.collection = l.collection
            AND t.token_id = l.token_id
            AND t.block_time >= l.block_time
    )
    -- finally, remove specific events (eg auction cancelled etc)
    -- which are indicative that the nft is no longer available
    -- note: important to apply this filter at the end. if we'd filter prior to
    -- 'last_event' per nft we might wrongly assume that this nft is still available on the market
    AND topic_0 NOT IN ($<excludeEnd:csv>)
`;

  const response = await indexa.query(query, {
    excludePrior: Object.values(excludePriorLastEvent)
      .map((i) => i.prior)
      .flat()
      .map((c) => `\\${c.slice(1)}`),
    excludeEnd: Object.values(excludePriorLastEvent)
      .map((i) => i.end)
      .flat()
      .map((c) => `\\${c.slice(1)}`),
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
        e.block_time,
      ])
    );
};

const getAvailableSmol = async (req, res) => {
  const query =
    availableBase +
    `
-- almost the same as above, but we limit return to collection and token_id (which massivly reduces
-- data transfer)
SELECT
    DISTINCT
    encode(collection, 'hex') AS collection,
    encode(token_id, 'escape') AS token_id
FROM
    last_event l
WHERE
    NOT EXISTS (
        SELECT
            1
        FROM
            ethereum.nft_trades t
        WHERE
            exchange_name IN ($<oneOfoneExchanges:csv>)
            AND t.collection = l.collection
            AND t.token_id = l.token_id
            AND t.block_time >= l.block_time
    )
    AND topic_0 NOT IN ($<excludeEnd:csv>)
`;

  const response = await indexa.query(query, {
    excludePrior: Object.values(excludePriorLastEvent)
      .map((i) => i.prior)
      .flat()
      .map((c) => `\\${c.slice(1)}`),
    excludeEnd: Object.values(excludePriorLastEvent)
      .map((i) => i.end)
      .flat()
      .map((c) => `\\${c.slice(1)}`),
    oneOfoneExchanges,
  });

  if (!response) {
    return new Error(`Couldn't get data`, 404);
  }

  res.status(200).json(response.map((e) => [e.collection, e.token_id]));
};

module.exports = {
  getHistory,
  getAvailable,
  getAvailableSmol,
};
