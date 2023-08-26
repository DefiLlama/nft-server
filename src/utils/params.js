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
    'looksrare-v1',
    'manifold-v1',
    'opensea-SaleClockAuction',
    'opensea-Wyvern',
    'rarible-ERC1155Sale',
    'rarible-ERC721Sale',
    'rarible-ExchangeV1',
  ],
  nullAddress: '0x0000000000000000000000000000000000000000',
  ethPaymentTokens: [
    '0x0000000000000000000000000000000000000000',
    '0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2', // weth
    '0x0000000000a39bb272e79075ade125fd351887ac', // blur bidding pool of eth
  ],
};
