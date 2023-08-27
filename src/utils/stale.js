const checkIfStale = (blockEvents, blockNftTable) =>
  blockEvents > blockNftTable;
module.exports = checkIfStale;
