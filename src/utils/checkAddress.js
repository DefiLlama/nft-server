const checkCollection = (collectionId) => {
  const address = collectionId.split(':')[0];
  return /^0x[0-9a-fA-F]{40}$/.test(address);
};

module.exports = checkCollection;
