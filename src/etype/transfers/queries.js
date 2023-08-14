const minify = require('pg-minify');

const { pgp, indexa } = require('../../utils/dbConnection');

const queryTransfers = `
SELECT
    encode(transaction_hash, 'hex') AS transaction_hash,
    log_index,
    encode(contract_address, 'hex') AS contract_address,
    encode(topic_0, 'hex') AS topic_0,
    encode(topic_1, 'hex') AS topic_1,
    encode(topic_2, 'hex') AS topic_2,
    encode(topic_3, 'hex') AS topic_3,
    encode(data, 'hex') AS data,
    block_time,
    block_number
FROM
    ethereum.event_logs
WHERE
    (
        (
            topic_0 = '\\xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef'
            AND topic_3 IS NOT NULL
        )
        OR (
            topic_0 = '\\xc3d58168c5ae7397731d063d5bbf3d657854427343f4c083240f7aacaa2d0f62'
        )
    )
    AND block_number >= $<startBlock>
    AND block_number <= $<endBlock>
`;

const getEvents = async (task, startBlock, endBlock) => {
  const response = await task.query(
    minify(queryTransfers, { compress: false }),
    {
      startBlock,
      endBlock,
    }
  );

  if (!response) {
    return new Error('getEvents failed', 404);
  }

  return response;
};

const buildInsertQ = (payload) => {
  const columns = [
    'transaction_hash',
    'log_index',
    'topic_0',
    'block_time',
    'block_number',
    'collection',
    'token_id',
    'from_address',
    'to_address',
    'amount',
  ];

  const cs = new pgp.helpers.ColumnSet(columns, {
    // column set requries tablename if schema is not undefined
    table: new pgp.helpers.TableName({
      schema: 'ethereum',
      table: 'nft_transfers',
    }),
  });

  const query = pgp.helpers.insert(payload, cs);

  return query;
};

const insertTransfers = async (payload) => {
  const query = buildInsertQ(payload);

  const response = await indexa.result(query);

  if (!response) {
    return new Error(`Couldn't insert into ethereum.nft_transfers`, 404);
  }

  return response;
};

const deleteQ = `
DELETE FROM
    ethereum.nft_transfers
WHERE
    (
        topic_0 = '\\xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef'
        OR topic_0 = '\\xc3d58168c5ae7397731d063d5bbf3d657854427343f4c083240f7aacaa2d0f62'
    )
    AND block_number >= $<startBlock>
    AND block_number <= $<endBlock>
  `;

const deleteTransfers = async (startBlock, endBlock) => {
  const response = await indexa.result(deleteQ, {
    startBlock,
    endBlock,
  });

  if (!response) {
    return new Error(`Couldn't delete from ethereum.nft_transfers`, 404);
  }

  return response;
};

// --------- transaction query
const deleteAndInsertTransfers = async (payload, startBlock, endBlock) => {
  // build queries
  const deleteQuery = deleteQ;
  const insertQuery = buildInsertQ(payload);

  return indexa
    .tx(async (t) => {
      // sequence of queries:
      // 1. delete transfers
      const q1 = await t.result(deleteQuery, {
        startBlock,
        endBlock,
      });

      // 2. insert transfers
      const q2 = await t.result(insertQuery);

      return [q1, q2];
    })
    .then((response) => {
      // success, COMMIT was executed
      return {
        status: 'success',
        data: response,
      };
    })
    .catch((err) => {
      // failure, ROLLBACK was executed
      console.log(err);
      return new Error('Transaction failed, rolling back', 404);
    });
};

module.exports = {
  getEvents,
  insertTransfers,
  deleteTransfers,
  deleteAndInsertTransfers,
};
