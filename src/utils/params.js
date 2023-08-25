module.exports = {
  blockRange: 25,
  blockRangeTest: 25,
  blockRangeMonitor: 50,
  nftTransferEvents: {
    erc721_Transfer:
      'ddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef',
    erc1155_TransferSingle:
      'c3d58168c5ae7397731d063d5bbf3d657854427343f4c083240f7aacaa2d0f62',
    looksrareV1RoyaltyPayment:
      '27c4f0403323142b599832f26acd21c74a9e5b809f2215726e244a4ac588cd7d',
  },
  exclude: [
    'looksrare',
    'manifold',
    'opensea-0x1f52b87C3503e537853e160adBF7E330eA0Be7C4',
    'openseaWyvern',
    'rarible-0x8c530A698B6E83d562DB09079BC458D4DaD4e6C5',
    'rarible-0x131AEBbfe55bcA0C9EAAD4Ea24D386C5C082dD58',
    'rarible-0xcd4EC7b66fbc029C116BA9Ffb3e59351c20B5B06',
  ],
};
