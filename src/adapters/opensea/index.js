const abiSeaport = require('./abiSeaport.json');
const config = require('./config.json');

const parse = (decodedData, event) => {
  // https://docs.opensea.io/reference/create-an-order
  // https://docs.opensea.io/reference/seaport-enums
  // https://docs.opensea.io/reference/seaport-overview

  // offer array -> 1 item being a currency
  // conisderation array -> 2-3 items where:
  // first = the asset,
  // second = opensea fee,
  // third = optional collection fee

  const { offerer, recipient, offer, consideration } = decodedData;

  // there are instances where required fields from offer and consideration are undefined
  // -> destructure based on condition
  const {
    itemType: itemTypeO,
    token: tokenO,
    identifier: identifierO,
    amount: amountO,
  } = offer.length > 0 ? offer[0] : {};

  // we require the itemtype to parse the event accordingly
  if (!itemTypeO) return {};

  const {
    token: tokenC,
    identifier: identifierC,
    amount: amountC,
  } = consideration.length > 0 ? consideration[0] : {};

  let collection;
  let tokenId;
  let paymentToken;
  let ethSalePrice;
  let nftAmount;
  let seller;
  let buyer;

  const iType = Number(itemTypeO);

  // itemType 0 = native (eth): seems like tx which have that itemType also emit an additional
  // itemType 2/3 event which has all details
  // note: still missing examples of itemType 4 & 5
  // --- erc20
  if (iType === 1) {
    collection = tokenC;
    tokenId = identifierC;
    nftAmount = amountC;
    ethSalePrice = amountO.toString() / 1e18;
    paymentToken = tokenO;
    seller = recipient;
    buyer = offerer;
    // --- erc271 or erc1155
  } else if (iType === 2 || iType === 3) {
    collection = tokenO;
    tokenId = identifierO;
    nftAmount = 1; // if multiple -> each in separate event
    ethSalePrice = amountC.toString() / 1e18;
    paymentToken = tokenC;
    seller = offerer;
    buyer = recipient;
  }

  return {
    collection,
    tokenId,
    amount: nftAmount,
    ethSalePrice,
    usdSalePrice: ethSalePrice * event.price,
    paymentToken,
    seller,
    buyer,
  };
};

module.exports = {
  abi: abiSeaport,
  config,
  parse,
};
