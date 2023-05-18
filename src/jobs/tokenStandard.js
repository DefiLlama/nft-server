const _ = require('lodash');
const axios = require('axios');
const minify = require('pg-minify');

const { indexa, pgp } = require('../utils/dbConnection');
const sleep = require('../utils/sleep');
const { convertKeysToSnakeCase } = require('../utils/keyConversion');

const fetchTokenStandard = async (ids) => {
  const api = 'https://api.reservoir.tools';

  const apiKey = {
    headers: { 'x-api-key': process.env.RESERVOIR_API_TOKEN_STANDARD },
  };

  // collections/v5 accepts a max of 20 collection ids per request
  const size = 20;
  const requests = [];
  for (let i = 0; i < ids.length; i += size) {
    const batch = ids.slice(i, size + i).join('&contract=');
    requests.push(`${api}/collections/v5?contract=${batch}`);
  }

  // free api key rate limite = 4RPS
  const rateLimit = 4;
  let payload = [];
  for (let i = 0; i <= requests.length; i += rateLimit) {
    const X = (
      await Promise.allSettled(
        requests.slice(i, rateLimit + i).map((r) => axios.get(r, apiKey))
      )
    )
      .filter((x) => x.status === 'fulfilled')
      .map((x) => x.value.data.collections)
      .flat()
      .map((c) => ({
        collection: Buffer.from(c.id.replace('0x', ''), 'hex'),
        tokenStandard: Buffer.from(c.contractKind),
        royaltyRecipient: c?.royalties?.recipient
          ? Buffer.from(c?.royalties?.recipient.replace('0x', ''), 'hex')
          : null,
        royaltyFeePct: c?.royalties?.bps ? c?.royalties?.bps / 100 : null,
      }));

    payload = [...payload, ...X];
    await sleep(1000);
  }

  return payload.map((i) => convertKeysToSnakeCase(i));
};

const insert = async (payload) => {
  const columns = [
    'collection',
    'tokenStandard',
    'royaltyRecipient',
    'royaltyFeePct',
  ].map((c) => _.snakeCase(c));
  const cs = new pgp.helpers.ColumnSet(columns, {
    table: new pgp.helpers.TableName({
      schema: 'ethereum',
      table: 'nft_collections',
    }),
  });

  const query = pgp.helpers.insert(payload, cs);
  const response = await indexa.result(query);

  if (!response) {
    return new Error(`Couldn't insert into collections`, 404);
  }

  return response;
};

const job = async () => {
  const query = minify(`
SELECT
  DISTINCT t.collection
FROM
  ethereum.nft_trades t
WHERE
  NOT EXISTS (
      SELECT
          1
      FROM
          ethereum.nft_collections c
      WHERE
          t.collection = c.collection
);
`);

  const collections = await indexa.query(query);
  const ids = collections.map((i) => `0x${i.collection.toString('hex')}`);

  const payload = await fetchTokenStandard(ids);
  console.log(payload.length);

  // db insert
  console.log('insert tokenStandard...');
  if (payload.length) {
    const response = await insert(payload);
    console.log(response);
  } else {
    console.log('empty payload for tokenStandard');
  }
};

module.exports = { tokenStandard: job, fetchTokenStandard, insert };
