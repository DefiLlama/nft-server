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

  const query = minify(`
WITH creator_collections AS (
    SELECT
        collection,
        token_id
    FROM
        ethereum.nft_creator
    WHERE
        creator = $<creator>
),
sovereign_collections AS (
    SELECT
        *
    FROM
        creator_collections
    WHERE
        token_id IS NULL
),
sovereign_collections_expanded AS (
    SELECT
        DISTINCT t.token_id,
        t.collection
    FROM
        ethereum.nft_transfers t
    JOIN sovereign_collections c ON t.collection = c.collection
    WHERE
        t.collection IN (
            SELECT
                collection
            FROM
                sovereign_collections
        )
),
contract_creations AS (
    SELECT
        DISTINCT created_contract_address
    FROM
        ethereum.transactions
    WHERE
        from_address = $<creator>
        AND created_contract_address IS NOT NULL
),
untracked_sovereign AS (
SELECT
    DISTINCT collection
FROM
    contract_creations c
    INNER JOIN ethereum.nft_transfers t ON c.created_contract_address = t.collection
),
joined AS (
    SELECT
        collection, token_id
    FROM
        sovereign_collections_expanded
    UNION
    SELECT
        collection, token_id
    FROM
        creator_collections
    WHERE
        token_id IS NOT NULL
    UNION
    SELECT
        collection, NULL AS token_id
    FROM
        untracked_sovereign
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
remaining AS (
    SELECT
        *
    FROM
        ethereum.transactions t
        LEFT JOIN nfts n ON t.created_contract_address = n.collection
        LEFT JOIN shared_or_factory s ON t.created_contract_address = s.collection
    WHERE
        n.collection IS NOT NULL
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
    encode(created_contract_address, 'hex') AS collection,
    NULL AS token_id,
    encode(from_address, 'hex') AS creator
FROM
    remaining
    `);

  const response = await indexa.query(query, {
    values,
    collections: nfts.map((nft) => `\\${nft.split(':')[0].slice(1)}`),
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
