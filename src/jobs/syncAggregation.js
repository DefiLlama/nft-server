const minify = require('pg-minify');

const { pgp, indexa } = require('../utils/dbConnection');
const { getMaxBlock } = require('../adapters/queries');
const checkIfStale = require('../utils/stale');

const BLOCK_RANGE = 7200;

const getMinBlock = async () => {
  const query = `
SELECT
  MIN(block_number)
FROM
  ethereum.nft_history
  `;

  const response = await indexa.query(query);

  if (!response) {
    return new Error(`Couldn't get data`, 404);
  }

  return response[0].min;
};

// get the last sale price of 1/1 nfts
const getLastSalePrice = async (start, stop) => {
  const query = minify(`
  SELECT
      DISTINCT ON (collection, token_id) encode(collection, 'hex') AS collection,
      encode(token_id, 'escape') AS token_id,
      encode(transaction_hash, 'hex') AS transaction_hash,
      block_time,
      block_number,
      log_index,
      encode(exchange_name, 'escape') AS exchange_name,
      eth_sale_price,
      encode(buyer, 'hex') AS owner_address
  FROM
      ethereum.nft_trades t
  WHERE
      block_number >= $<start>
      AND block_number <= $<stop>
      -- filter to 1/1 nfts only
      AND (
          EXISTS (
              SELECT
                  1
              FROM
                  ethereum.nft_history h
              WHERE
                  h.collection = t.collection
                  AND h.token_id = t.token_id
          )
          OR t.exchange_name IN ($<oneOfoneExchanges:csv>)
      )
  ORDER BY
      collection,
      token_id,
      block_number DESC,
      log_index DESC
      `);

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

  const response = await indexa.query(query, {
    start,
    stop,
    oneOfoneExchanges,
  });

  if (!response) {
    return new Error(`Couldn't get data`, 404);
  }

  return response;
};

// get burned 1/1 nfts
const getBurned = async (start, stop) => {
  const query = minify(`
SELECT
    encode(collection, 'hex') as collection,
    encode(token_id, 'escape') as token_id
FROM
    ethereum.nft_transfers t
WHERE
    block_number >= $<start>
    AND block_number <= $<stop>
    AND EXISTS (
        SELECT
            1
        FROM
            ethereum.nft_history h
        WHERE
            h.collection = t.collection
            AND h.token_id = t.token_id
    )
    AND to_address = '\\x0000000000000000000000000000000000000000'
    `);

  const response = await indexa.query(query, { start, stop });

  if (!response) {
    return new Error(`Couldn't get data`, 404);
  }

  return response;
};

const getCreator = async (nfts) => {
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
WITH shared AS (
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
),
nfts(collection, token_id) AS (
    VALUES
        ${values}
),
-- for factory and sovereign collections we read creator from traces
-- note: we could read most factory collection from nft_creator, but traces more complete + more accurate
-- and most importantly, the query is significantly faster this way
remaining AS (
    SELECT
        *
    FROM
        ethereum.traces t
        LEFT JOIN nfts n ON t.address = n.collection
        LEFT JOIN shared s ON t.address = s.collection
    WHERE
        t.type = 'create'
        AND n.collection IS NOT NULL
        AND s.collection IS NULL
        AND t.address NOT IN ($<sharedCollections:csv>)
)
SELECT
    encode(collection, 'hex') AS collection,
    encode(token_id, 'escape') AS token_id,
    encode(creator, 'hex') AS creator
FROM
    shared
UNION
SELECT
    encode(address, 'hex') AS collection,
    NULL AS token_id,
    encode(transaction_from_address, 'hex') AS creator
FROM
    remaining
`);

  const response = await indexa.query(query, {
    values,
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

  const d = {};
  response.forEach((i) => {
    d[`${i.collection}:${i.token_id}`.toLowerCase()] = i.creator;
  });

  return d;
};

const castTypesSalePrice = (e) => {
  return {
    collection: Buffer.from(e.collection.replace('0x', ''), 'hex'),
    token_id: Buffer.from(e.token_id.toString()),
    transaction_hash: Buffer.from(e.transaction_hash, 'hex'),
    block_time: new Date(e.block_time),
    block_number: Number(e.block_number),
    log_index: Number(e.log_index),
    exchange_name: Buffer.from(e.exchange_name),
    eth_sale_price: Number.isFinite(e.eth_sale_price)
      ? Number(e.eth_sale_price)
      : null,
    owner_address: e.owner_address
      ? Buffer.from(e.owner_address.replace('0x', ''), 'hex')
      : null,
    creator_address: e.creator_address
      ? Buffer.from(e.creator_address.replace('0x', ''), 'hex')
      : null,
  };
};

const castTypesBurned = (e) => {
  return {
    collection: Buffer.from(e.collection.replace('0x', ''), 'hex'),
    token_id: Buffer.from(e.token_id.toString()),
  };
};

const buildUpsertQuery = (lastSale) => {
  const columns = [
    'collection',
    'token_id',
    'transaction_hash',
    'block_time',
    'block_number',
    'log_index',
    'exchange_name',
    'eth_sale_price',
    'owner_address',
    'creator_address',
  ];
  const cs = new pgp.helpers.ColumnSet(columns, {
    // column set requries tablename if schema is defined
    table: new pgp.helpers.TableName({
      schema: 'ethereum',
      table: 'nft_aggregation',
    }),
  });
  const upsertQuery =
    pgp.helpers.insert(lastSale, cs) +
    ' ON CONFLICT (collection, token_id) DO UPDATE SET ' +
    cs.assignColumns({
      from: 'EXCLUDED',
      skip: ['collection', 'token_id', 'creator_address'], // these stay constant
    });

  return upsertQuery;
};

const buildDeleteQuery = (burned) => {
  const deleteQuery = pgp.as.format(
    'DELETE FROM ethereum.nft_aggregation WHERE (collection, token_id) IN ($<burnedNfts:raw>)',
    { burnedNfts: pgp.helpers.values(burned, ['collection', 'token_id']) }
  );

  return deleteQuery;
};

const upsertDeleteTx = async (payloadSale, payloadBurned) => {
  const upsertQuery = buildUpsertQuery(payloadSale);
  const deleteQuery = buildDeleteQuery(payloadBurned);

  return indexa
    .tx(async (t) => {
      // sequence of queries:
      // 1. upsert last sale price
      const q1 = await t.result(upsertQuery);

      // 2. delete burned nfts
      const q2 = await t.result(deleteQuery);

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

const sync = async () => {
  let [blockTrades, blockAggregation] = await indexa.task(async (t) => {
    return await Promise.all(
      ['nft_trades', 'nft_aggregation'].map((table) =>
        getMaxBlock(t, `ethereum.${table}`)
      )
    );
  });

  let blockLastSynced = blockAggregation ?? (await getMinBlock()) - 1;

  console.log(
    `syncing nft_aggregation, ${
      blockTrades - blockLastSynced
    } block(s) behind nft_trades\n`
  );

  let stale = checkIfStale(blockTrades, blockLastSynced);

  while (stale) {
    let startBlock = blockLastSynced + 1;
    let endBlock = Math.min(startBlock + BLOCK_RANGE, blockTrades);

    const [lastSalePrice, burned] = await Promise.all([
      getLastSalePrice(startBlock, endBlock),
      getBurned(startBlock, endBlock),
    ]);

    if (lastSalePrice.length) {
      const nfts = lastSalePrice.map((i) => `0x${i.collection}:${i.token_id}`);
      const creators = await getCreator(nfts);

      // format
      const lastSale = lastSalePrice.map((i) => {
        const creator =
          // shared
          creators[`${i.collection}:${i.token_id}`.toLowerCase()] ??
          // factories/sovereign (will have token_id == null)
          creators[`${i.collection}:null`.toLowerCase()];

        return {
          ...i,
          creator_address: creator,
        };
      });

      const payloadSale = lastSale.map((i) => castTypesSalePrice(i));
      const payloadBurned = burned.map((i) => castTypesBurned(i));

      let countSales = 0;
      let countBurned = 0;
      let response;
      if (payloadSale.length && payloadBurned.length) {
        response = await upsertDeleteTx(payloadSale, payloadBurned);
        countSales = response.data[0].rowCount;
        countBurned = response.data[1].rowCount;
      } else if (payloadSale.length) {
        const upsertQuery = buildUpsertQuery(payloadSale);
        response = await indexa.result(upsertQuery);
        countSales = response?.rowCount ?? 0;
      } else if (payloadBurned.length) {
        const deleteQuery = buildDeleteQuery(payloadBurned);
        response = await indexa.result(deleteQuery);
        countBurned = response?.rowCount ?? 0;
      }

      console.log(
        `synced blocks: ${startBlock}-${
          stale ? endBlock : blockTrades
        } [upserted: ${countSales}, deleted: ${countBurned}]`
      );
    } else {
      console.log(
        `synced blocks: ${startBlock}-${stale ? endBlock : blockTrades}`
      );
    }

    stale = checkIfStale(blockTrades, endBlock);
    blockLastSynced = endBlock;
  }
};

const exe = async () => {
  while (true) {
    await sync();
    console.log('pausing exe');
    await new Promise((resolve) => setTimeout(resolve, 15 * 1e3));
  }
};

exe();
