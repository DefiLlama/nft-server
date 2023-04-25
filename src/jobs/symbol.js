const minify = require('pg-minify');
const sdk = require('@defillama/sdk');

const { pgp, nft } = require('../utils/dbConnection');

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
    symbol IS NULL
    AND token_standard = 'erc721'
    AND collection_id NOT IN ($<exclude:csv>)
    AND collection_id NOT LIKE '%:%'
`);

const job = async () => {
  const collections = await nft.query(query, { exclude });
  const ids = [...new Set(collections.map((c) => c.collection_id))];

  try {
    const symbols = await sdk.api.abi.multiCall({
      abi: 'erc20:symbol',
      calls: ids.map((id) => ({ target: id })),
    });

    if (symbols?.length) {
      const payload = symbols.output.map((s) => ({
        collection_id: s.input.target,
        symbol: s.output,
      }));

      const cs = new pgp.helpers.ColumnSet(['?collection_id', 'symbol'], {
        table: 'collection',
      });

      const q =
        pgp.helpers.update(payload.flat(), cs) +
        ' WHERE v.collection_id = t.collection_id';

      const response = await nft.result(q);
      console.log(response);
    }
  } catch (err) {
    console.log(err);
  }
};

module.exports = job;
