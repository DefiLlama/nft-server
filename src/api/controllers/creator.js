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
SELECT
  encode(transaction_hash, 'hex') AS transaction_hash,
  log_index,
  encode(contract_address, 'hex') AS contract_address,
  encode(topic_0, 'hex') AS topic_0,
  block_time,
  block_number,
  encode(exchange_name, 'escape') AS exchange_name,
  encode(collection, 'hex') AS collection,
  encode(token_id, 'escape') AS token_id
FROM
  ethereum.nft_creator
WHERE
  creator = $<creator>
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
    .json(
      response
        .sort(
          (a, b) => b.block_time - a.block_time || b.log_index - a.log_index
        )
        .map((c) => convertKeysToCamelCase(c))
    );
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
SELECT
    encode(collection, 'hex') AS collection,
    encode(token_id, 'escape') AS token_id,
    encode(creator, 'hex') AS creator
FROM
    ethereum.nft_creator
WHERE 
    (collection, token_id) IN (VALUES ${values})
    `);

  const response = await indexa.query(query, {
    values,
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