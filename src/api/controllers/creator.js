const minify = require('pg-minify');

const { checkCollection, checkNft } = require('../../utils/checkAddress');
const { convertKeysToCamelCase } = require('../../utils/keyConversion');
const { customHeaderFixedCache } = require('../../utils/customHeader');
const { indexa } = require('../../utils/dbConnection');

// get all nfts created by a creator
const getCreatedNfts = async (req, res) => {
  const creator = req.params.creator;
  if (!checkCollection(creator))
    return res.status(400).json('invalid address!');

  // note: rn we do not read factory info from nft_creator but directly
  // from traces, meaning: in theory we could delete factory only based creator adapters

  const query = minify(`
-- shared contract collections
WITH shared_collections AS (
    SELECT
        collection,
        token_id
    FROM
        ethereum.nft_creator
    WHERE
        creator = $<creator>
        AND token_id IS NOT NULL
),
-- sovereign collections (direct and factory)
sovereign_collections AS (
    SELECT
        address AS collection
    FROM
        ethereum.traces
    WHERE
        -- keep that order (order of the composite index)
        TYPE = 'create'
        AND transaction_from_address = $<creator>
),
-- expand with token_id and remove any contract which is not in nft_transfers (INNER JOIN)
sovereign_collections_expanded AS (
    SELECT
        DISTINCT s.collection,
        t.token_id
    FROM
        ethereum.nft_transfers t
        INNER JOIN sovereign_collections s ON t.collection = s.collection
-- WHERE clause seems redundant but for whatever reason the query becomes unusable without it
    WHERE
        s.collection IN (
            SELECT
                collection
            FROM
                ethereum.nft_transfers
        )
),
-- combine
joined AS (
    SELECT
        *
    FROM
        shared_collections
    UNION
    ALL
    SELECT
        *
    FROM
        sovereign_collections_expanded
)
SELECT
    concat(
        encode(collection, 'hex'),
        ':',
        encode(token_id, 'escape')
    ) AS nft
FROM
    joined
ORDER BY
    nft
`);

  const response = await indexa.query(query, {
    creator: `\\${creator.slice(1)}`,
  });

  if (!response) {
    return new Error(`Couldn't get data`, 404);
  }

  res
    .set(customHeaderFixedCache(300))
    .status(200)
    .json(response.map((i) => i.nft));
};

// get creators of a set of nfts
const getCreators = async (req, res) => {
  const nfts = req.params.nfts?.split(',');
  if (nfts.map((nft) => checkNft(nft)).includes(false))
    return res.status(400).json('invalid query params!');

  // note:
  // using collection IN and token_id IN separately would return all possible combinations
  // instead of the request specific ones only. for that we use IN (VALUES ((c1, t1), (c2, t2)...,(cN, tN)))
  // however, postgres VALUES works differently compared to standard IN:
  // it infers the type of the literals within the VALUES clause as text
  // but the revelant fields here (collection and token_id) are stored as bytea, hence need to explicitly cast
  // via ::bytea
  const values = nfts
    .map((nft) => {
      nft_ = nft.split(':');
      const c = `\\${nft_[0].slice(1)}`;
      const id = nft_[1];
      return `('${c}'::bytea, '${id}'::bytea)`;
    })
    .join(', ');

  const query = minify(`
WITH shared_or_factory AS (
    SELECT
        collection,
        token_id,
        creator
    FROM
        ethereum.nft_creator
    WHERE
        (collection, token_id) IN (
            VALUES
                ${values}
        )
        OR (
            collection IN ($<collections:csv>)
            AND token_id IS NULL
        )
),
nfts(collection, token_id) AS (
    VALUES
        ${values}
),
-- any collections we do not directly track via adapters (eg missing factories as well as sovereign)
remaining AS (
    SELECT
        *
    FROM
        ethereum.traces t
        LEFT JOIN nfts n ON t.address = n.collection
        LEFT JOIN shared_or_factory s ON t.address = s.collection
    WHERE
        t.type = 'create'
        AND n.collection IS NOT NULL
        AND s.collection IS NULL
)
SELECT
    encode(collection, 'hex') AS collection,
    encode(token_id, 'escape') AS token_id,
    encode(creator, 'hex') AS creator
FROM
    shared_or_factory
UNION
SELECT
    encode(address, 'hex') AS collection,
    NULL AS token_id,
    encode(transaction_from_address, 'hex') AS creator
FROM
    remaining
WHERE
    address NOT IN ($<sharedCollections:csv>)
    `);

  const response = await indexa.query(query, {
    values,
    collections: nfts.map((nft) => `\\${nft.split(':')[0].slice(1)}`),
    sharedCollections: [
      '0x2963ba471e265e5f51cafafca78310fe87f8e6d1',
      '0x2a46f2ffd99e19a89476e2f62270e0a35bbf0756',
      '0x2d9e5de7d36f3830c010a28b29b3bdf5ca73198e',
      '0x3b3ee1931dc30c1957379fac9aba94d1c48a5405',
      '0x41a322b28d0ff354040e2cbc676f0320d8c8850d',
      '0x495f947276749ce646f68ac8c248420045cb7b5e',
      '0x60f80121c31a0d46b5279700f9df786054aa5ee5',
      '0x6a5ff3ceecae9ceb96e6ac6c76b82af8b39f0eb3',
      '0xabb3738f04dc2ec20f4ae4462c3d069d02ae045b',
      '0xabefbc9fd2f806065b4f3c237d4b59d9a97bcac7',
      '0xb66a603f4cfe17e3d27b87a8bfcad319856518b8',
      '0xb932a70a57673d89f4acffbe830e8ed7f75fb9e0',
      '0xc9154424b823b10579895ccbe442d41b9abd96ed',
      '0xcd51b81ac1572707b7f3051aa97a31e2afb27d45',
      '0xd07dc4262bcdbf85190c01c996b4c06a461d2430',
      '0xf6793da657495ffeff9ee6350824910abc21356c',
      '0xfbeef911dc5821886e1dda71586d90ed28174b7d',
    ].map((c) => `\\${c.slice(1)}`),
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
  getCreatedNfts,
  getCreators,
};
