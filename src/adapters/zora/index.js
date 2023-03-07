const abiMarket = require('./abiMarket.json');
const abiAsk = require('./abiAsk.json');
const abiOffer = require('./abiOffer.json');
const abiAuction = require('./abiAuction.json');
const config = require('./config.json');

const parse = (decodedData, event, interface, eventName) => {
  let tokenContract;
  let tokenId;
  let buyer;
  let seller;
  let paymentToken;
  let price;

  if (eventName === 'BidFinalized') {
    ({
      tokenId,
      bid: {
        amount: price,
        currency: paymentToken,
        bidder: buyer,
        recipient: seller,
      },
    } = decodedData);
  } else if (eventName === 'AskFilled') {
    // --- asks
    ({ tokenContract, tokenId, buyer, seller, price } = decodedData);
  } else if (eventName === 'OfferFilled') {
    // --- offers
    ({
      tokenContract,
      tokenId,
      taker: seller,
      offer: { maker: buyer, currency: paymentToken, amount: price },
    } = decodedData);
  } else if (eventName === 'AuctionEnded') {
    // --- auction
    ({
      tokenContract,
      tokenId,
      auction: { seller, highestBid: price, highestBidder: buyer },
    } = decodedData);
  }

  const ethSalePrice = price.toString() / 1e18;

  return {
    collection: tokenContract,
    tokenId,
    amount: 1,
    ethSalePrice,
    usdSalePrice: ethSalePrice * event.price,
    paymentToken: paymentToken ?? '0x0000000000000000000000000000000000000000',
    seller,
    buyer,
  };
};

module.exports = {
  abi: [...abiMarket, ...abiAsk, ...abiOffer, ...abiAuction],
  config,
  parse,
};
