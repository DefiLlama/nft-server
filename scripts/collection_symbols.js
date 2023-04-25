const minify = require('pg-minify');
const sdk = require('@defillama/sdk');

const { pgp, nft } = require('../src/utils/dbConnection');

const exclude = [
  '0x62674b8ace7d939bb07bea6d32c55b74650e0eaa', // EtherOrcs Allies
  '0x57f1887a8bf19b14fc0df6fd9b2acc9af147ea85', // ens
];

const query = minify(`
SELECT
    distinct collection_id
FROM 
    collection
WHERE
    token_standard = 'erc721'
    AND collection_id NOT IN ($<exclude:csv>)
    AND collection_id NOT LIKE '%:%'
`);

(async () => {
  const collections = await nft.query(query, { exclude });
  const ids = [...new Set(collections.map((c) => c.collection_id))];

  const size = 100;
  const N = Math.ceil(ids.length / size);

  const payload = [];
  for (let i = 0; i <= N; i++) {
    console.log(i);
    const start = i * size;
    const stop = start + size;

    const symbols = await sdk.api.abi.multiCall({
      abi: 'erc20:symbol',
      calls: ids.slice(start, stop).map((id) => ({ target: id })),
    });

    payload.push(
      symbols.output.map((s) => ({
        collection_id: s.input.target,
        symbol: s.output,
      }))
    );
  }

  const cs = new pgp.helpers.ColumnSet(['?collection_id', 'symbol'], {
    table: 'collection',
  });

  const q =
    pgp.helpers.update(payload.flat(), cs) +
    ' WHERE v.collection_id = t.collection_id';

  const response = await nft.result(q);
  console.log(response);

  process.exit();
})();
