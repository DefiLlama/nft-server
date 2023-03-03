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
  b.price
FROM
  ethereum.event_logs e
  LEFT JOIN ethereum.blocks b ON e.block_time = b.time
WHERE
  e.topic_0 in ($<topic0:csv>)
  AND e.block_number >= $<startBlock>
  AND e.block_number <= $<endBlock>
`;

// distinct on = retrieve only the latest sample for each topic0
const queryTest = `
SELECT DISTINCT ON (e.topic_0)
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
  b.price
FROM
  ethereum.event_logs e
  LEFT JOIN ethereum.blocks b ON e.block_time = b.time
WHERE
  e.topic_0 in ($<topic0:csv>)
  AND e.block_number >= $<startBlock>
  AND e.block_number <= $<endBlock>
ORDER BY
  e.topic_0, e.block_number DESC;
`;

const getEvents = async (
  startBlock,
  endBlock,
  eventsSignatureHash,
  test = false
) => {
  const conn = await connect();

  const q = test ? queryTest : query;

  const response = await conn.query(minify(q, { compress: false }), {
    startBlock,
    endBlock,
    topic0: eventsSignatureHash,
  });

  if (!response) {
    return new Error('getEvents failed', 404);
  }

  return response;
};

module.exports = getEvents;
