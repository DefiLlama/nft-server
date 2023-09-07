const checkCollection = (collectionId) => {
  const address = collectionId.split(':')[0];
  return /^0x[0-9a-fA-F]{40}$/.test(address);
};

const checkNft = (nft) => {
  if (!nft.includes(':')) return false;
  const nft_ = nft.split(':');
  const address = nft_[0];
  const tokenId = nft_[1];
  if (!tokenId || !tokenId.length || !isFinite(tokenId)) return false;

  return /^0x[0-9a-fA-F]{40}$/.test(address);
};

module.exports = { checkCollection, checkNft };
