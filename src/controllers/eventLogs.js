const minify = require('pg-minify');

const { connect } = require('../utils/dbConnection');

const query = `
SELECT
  encode(e.transaction_hash, 'hex') AS transaction_hash,
  e.log_index,
  encode(e.contract_address, 'hex') AS contract_address,
  encode(e.topic_0, 'hex') AS topic_0,
  encode(e.topic_1, 'hex') AS topic_1,
  encode(e.topic_2, 'hex') AS topic_2,
  encode(e.topic_3, 'hex') AS topic_3,
  encode(e.data, 'hex') AS data,
  e.block_time,
  e.block_number,
  encode(e.block_hash, 'hex') AS block_hash,
  b.price,
  encode(t.to_address, 'hex') as to_address
FROM
  ethereum.event_logs e
  LEFT JOIN ethereum.blocks b ON e.block_time = b.time
  LEFT JOIN ethereum.transactions t ON e.transaction_hash = t.hash
WHERE
  e.contract_address in ($<contractAddresses:csv>)
  AND e.topic_0 in ($<eventSignatureHashes:csv>)
  AND e.block_number >= $<startBlock>
  AND e.block_number <= $<endBlock>
`;

// opensea-wyvern & rarible events do not contain collection and tokenId, hence we need to also
// query nft transfer events
const queryExtensive = `
SELECT
    encode(e.transaction_hash, 'hex') AS transaction_hash,
    e.log_index,
    encode(e.contract_address, 'hex') AS contract_address,
    encode(e.topic_0, 'hex') AS topic_0,
    encode(e.topic_1, 'hex') AS topic_1,
    encode(e.topic_2, 'hex') AS topic_2,
    encode(e.topic_3, 'hex') AS topic_3,
    encode(e.data, 'hex') AS data,
    e.block_time,
    e.block_number,
    encode(e.block_hash, 'hex') AS block_hash,
    b.price,
    encode(t.from_address, 'hex') AS from_address,
    encode(t.to_address, 'hex') AS to_address
FROM
    ethereum.event_logs e
    LEFT JOIN ethereum.blocks b ON e.block_time = b.time
    LEFT JOIN ethereum.transactions t ON e.transaction_hash = t.hash
WHERE
    (
        (
            e.contract_address IN ($<contractAddresses:csv>)
            AND e.topic_0 IN ($<eventSignatureHashes:csv>)
        )
        OR (
            e.topic_0 = '\\xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef'
            AND topic_3 IS NOT NULL
        )
        OR (
          e.topic_0 = '\\xc3d58168c5ae7397731d063d5bbf3d657854427343f4c083240f7aacaa2d0f62'
      )
    )
    AND e.block_number >= $<startBlock>
    AND e.block_number <= $<endBlock>
`;

const getEvents = async (startBlock, endBlock, config) => {
  const eventSignatureHashes = config.events.map(
    (e) => `\\${e.signatureHash.slice(1)}`
  );
  const contractAddresses = config.contracts.map((c) => `\\${c.slice(1)}`);

  const q =
    config.exchangeName === 'rarible' || config.version === 'wyvern'
      ? queryExtensive
      : query;

  const conn = await connect('indexa');
  const response = await conn.query(minify(q, { compress: false }), {
    startBlock,
    endBlock,
    eventSignatureHashes,
    contractAddresses,
  });

  if (!response) {
    return new Error('getEvents failed', 404);
  }

  return response;
};

module.exports = getEvents;
