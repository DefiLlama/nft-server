// some sudoswap txs can contain muliple SwapNFTInPair/SwapNFTOutPair events. given that the event itself
// doesn't contain any useful info we drop any duplicates to prevent parseEvent to process the same content twice
// (for sudoswap we extract all relevant data from transfer events and traces)
const removeRedundantEvents = (marketplaceEvents) => {
  const txHashes = {};
  return marketplaceEvents.filter((e) => {
    if (txHashes[e.transaction_hash]) {
      return false;
    } else {
      txHashes[e.transaction_hash] = true;
      return true;
    }
  });
};

module.exports = removeRedundantEvents;
