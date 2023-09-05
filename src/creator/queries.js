const minify = require('pg-minify');

const { convertKeysToCamelCase } = require('../utils/keyConversion');
const { pgp, indexa } = require('../utils/dbConnection');

const getCollectionWithoutCreator = async () => {
  const query = minify(`
    SELECT
        DISTINCT ON (collection, token_id) encode(contract_address, 'hex') AS contract_address,
        encode(exchange_name, 'escape') AS exchange_name,
        encode(collection, 'hex') AS collection,
        encode(token_id, 'escape') AS token_id
    FROM
        ethereum.nft_history h
    WHERE
        NOT EXISTS (
            SELECT
                1
            FROM
                ethereum.nft_creator c
            WHERE
                c.collection = h.collection
                AND c.token_id = h.token_id
        )
    ORDER BY
        collection,
        token_id,
        block_number ASC,
        log_index ASC
    LIMIT 100
      `);

  const response = await indexa.query(query, {});

  if (!response) {
    return new Error('getEvents failed', 404);
  }

  return response.map((c) => convertKeysToCamelCase(c));
};
