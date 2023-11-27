const minify = require('pg-minify');

const { pgp, indexa } = require('../utils/dbConnection');

const getTradesQ = minify(`
SELECT
  block_time,
  block_number,
  encode(exchange_name, 'escape') AS exchange_name,
  encode(collection, 'hex') AS collection,
  encode(token_id, 'escape') AS token_id,
  eth_sale_price,
  encode(seller, 'hex') AS seller,
  encode(buyer, 'hex') AS buyer
FROM
  ethereum.nft_trades
WHERE
  block_number BETWEEN $<start>
  AND $<stop>
    `);

const getTransfersQ = minify(`
  SELECT
    block_time,
    block_number,
    encode(collection, 'hex') AS collection,
    encode(token_id, 'escape') AS token_id,
    encode(from_address, 'hex') AS from_address,
    encode(to_address, 'hex') AS to_address
  FROM
    ethereum.nft_transfers
  WHERE
    block_number BETWEEN $<start>
    AND $<stop>`);

const getHistoryQ = minify(`
    SELECT
      block_time,
      block_number,
      encode(exchange_name, 'escape') AS exchange_name,
      encode(event_type, 'escape') AS event_type,
      encode(collection, 'hex') AS collection,
      encode(token_id, 'escape') AS token_id,
      eth_price,
      encode(user_address, 'hex') AS user_address
    FROM
      ethereum.nft_history
    WHERE
      block_number BETWEEN $<start>
      AND $<stop>`);

const getCreatorQ = minify(`
    SELECT
      block_time,
      block_number,
      encode(exchange_name, 'escape') AS exchange_name,
      encode(collection, 'hex') AS collection,
      encode(token_id, 'escape') AS token_id,
      encode(creator, 'hex') AS creator
    FROM
      ethereum.nft_creator
    WHERE
      block_number BETWEEN $<start>
      AND $<stop>`);

const getData = async (start, stop, query) => {
  const response = await indexa.query(query, { start, stop });

  if (!response) {
    return new Error(`Couldn't get data`, 404);
  }

  return response;
};

(async () => {
  const start = 18654184;
  const blockRange = 25;
  const stop = start + blockRange;

  const res = await Promise.all(
    [getTradesQ, getTransfersQ, getHistoryQ, getCreatorQ].map((query) =>
      getData(start, stop, query)
    )
  );

  console.log(res);
  process.exit();
})();
