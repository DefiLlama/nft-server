const sdk = require('@defillama/sdk');

const abi = require('./abi.json');
const config = require('./config.json');

const parse = async (decodedData, event) => {
  const { _tokenId, _editionNumber } = decodedData;

  // an alternative to calling the contract would be to parse EditionCreated event
  // (would require tx input data in the event query, which contains the creator address)
  // this means we'd reference via editionNumbers
  // and queries on the db table would then require filling null creator address prior to fetching
  // (same as in auction ids in nft_history)
  const artist = (
    await sdk.api.abi.call({
      target: event.contract_address,
      abi: abi.find((m) => m.name === 'detailsOfEdition'),
      params: [_editionNumber],
    })
  ).output._artistAccount;

  return {
    collection: event.contract_address,
    tokenId: _tokenId,
    creator: artist,
  };
};

module.exports = { abi, config, parse };
