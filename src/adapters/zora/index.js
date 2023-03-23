const abiMarket = require('./abiMarket.json');
const abiAsk = require('./abiAsk.json');
const abiOffer = require('./abiOffer.json');
const abiAuctionHouse = require('./abiAuctionHouse.json');
const abiAuction = require('./abiAuction.json');
const abiReserveAcutionFindersETH = require('./abiReserveAuctionFindersETH.json');
const abiAsksPrivateETH = require('./abiAsksPrivateETH.json');
const abiAsksV1_1 = require('./abiAsksV1.1.json');
const config = require('./config.json');

const parse = (decodedData, event, events) => {
  let tokenContract;
  let tokenId;
  let buyer;
  let seller;
  let paymentToken;
  let price;

  if (
    event.topic_0 ===
    'b6ef177c7a6f32b283a49b5e0463a39240cdaa278028dfb219480d050e8ee54c' // BidFinalized
  ) {
    // remove potential lazy mint and match on transaction_hash
    const transfers = events.filter(
      (e) =>
        e.topic_1 !==
          '0000000000000000000000000000000000000000000000000000000000000000' &&
        e.transaction_hash === event.transaction_hash
    );

    // find the first transfer event which has the from address in either topic_1 - topic_3
    // so we catch both cases of erc721 transfer and erc1155 TransferSingle
    const transferEvent = transfers.find(
      (tf) =>
        tf.topic_1.includes(event.from_address) ||
        tf.topic_2.includes(event.from_address) ||
        tf.topic_3.includes(event.from_address)
    );

    if (!transferEvent) return {};

    let buyer;
    let seller;
    if (transferEvent.topic_0 === nftTransferEvents['erc721_Transfer']) {
      seller = stripZerosLeft(`0x${transferEvent.topic_1}`);
      buyer = stripZerosLeft(`0x${transferEvent.topic_2}`);
    } else if (
      transferEvent.topic_0 === nftTransferEvents['erc1155_TransferSingle']
    ) {
      seller = stripZerosLeft(`0x${transferEvent.topic_2}`);
      buyer = stripZerosLeft(`0x${transferEvent.topic_3}`);
    }

    ({
      tokenId,
      bid: { amount: price, currency: paymentToken },
    } = decodedData);
    // zora erc721 token
    tokenContract = '0xabefbc9fd2f806065b4f3c237d4b59d9a97bcac7';
  } else if (
    event.topic_0 ===
    'ed509339c949cdfdb11c117315bb3f74aa98886204732c065edd38979d7ccf53' // AskFilled
  ) {
    ({ tokenContract, tokenId, buyer, seller, price } = decodedData);
  } else if (
    event.topic_0 ===
    '8d496f5c680daaaf5bdacfec3235619ed8eb52d6c31419098dfb83010f37ca22' // OfferFilled
  ) {
    ({
      tokenContract,
      tokenId,
      taker: seller,
      offer: { maker: buyer, currency: paymentToken, amount: price },
    } = decodedData);
  } else if (
    // AuctionEnded & AuctionEnded (FindersETH)
    [
      'de4690ca69ca2f9bab030a05a3072d626b0692c7020c1ef534aa3cc140fb1ff5',
      '63f2e8137a051fe1c1458eb3c749d1e217f48dee1c1a37eba679273cc635ca42',
    ].includes(event.topic_0)
  ) {
    ({
      tokenContract,
      tokenId,
      auction: { seller, highestBid: price, highestBidder: buyer },
    } = decodedData);
  } else if (
    event.topic_0 ===
    '4f35fb3ea0081b3ccbe8df613cab0f9e1694d50a025e0aa09b88a86a3d07c2de'
  ) {
    ({
      tokenId,
      tokenContract,
      tokenOwner: seller,
      winner: buyer,
      paymentToken: auctionCurrency,
      amount: price,
    } = decodedData);
  } else if (
    event.topic_0 ===
    '9c826e8c90f6a11429369613c862c10af42611ca3c5d4d4be035765cec439cb5'
  ) {
    ({
      tokenId,
      tokenContract,
      ask: { seller, buyer, price },
    } = decodedData);
  } else if (
    event.topic_0 ===
    '21a9d8e221211780696258a05c6225b1a24f428e2fd4d51708f1ab2be4224d39'
  ) {
    ({
      tokenId,
      tokenContract,
      buyer,
      ask: { seller, askPrice: price, askCurrency },
    } = decodedData);
  }

  const salePrice = price.toString() / 1e18;

  return {
    collection: tokenContract,
    tokenId,
    amount: 1,
    salePrice,
    ethSalePrice: salePrice,
    usdSalePrice: salePrice * event.price,
    paymentToken: paymentToken ?? '0x0000000000000000000000000000000000000000',
    seller,
    buyer,
  };
};

module.exports = {
  // note: the 3 auction events all have unique func sign
  abi: [
    ...abiMarket,
    ...abiAsk,
    ...abiOffer,
    ...abiAuction,
    ...abiAuctionHouse,
    ...abiReserveAcutionFindersETH,
    ...abiAsksPrivateETH,
    ...abiAsksV1_1,
  ].filter((a) => a.type === 'event'),
  config,
  parse,
};
