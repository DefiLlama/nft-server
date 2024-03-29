const minify = require('pg-minify');

const { pgp, indexa } = require('../utils/dbConnection');
const { getMaxBlock } = require('../adapters/queries');
const checkIfStale = require('../utils/stale');
const { getCreatorsQuery } = require('../api/controllers/creator');

const BLOCK_RANGE = 1000;

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
    'opensea',
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

const getCreator = async (nfts) => {
  const response = await getCreatorsQuery(nfts);

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

const upsert = async (lastSale) => {
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
  const query =
    pgp.helpers.insert(lastSale, cs) +
    ' ON CONFLICT (collection, token_id) DO UPDATE SET ' +
    cs.assignColumns({
      from: 'EXCLUDED',
      skip: ['collection', 'token_id', 'creator_address'], // these stay constant
    });

  const response = await indexa.result(query);

  return response;
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

    const lastSalePrice = await getLastSalePrice(startBlock, endBlock);

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

      if (lastSale.length) {
        const payloadSale = lastSale.map((i) => castTypesSalePrice(i));
        const response = await upsert(payloadSale);
        const count = response?.rowCount ?? 0;

        console.log(
          `synced blocks: ${startBlock}-${
            stale ? endBlock : blockTrades
          } [upserted: ${count}]`
        );
      }
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
