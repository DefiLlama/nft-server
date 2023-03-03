const abiSeaport = require('./abiSeaport.json');
const abiWyvern = require('./abiWyvern.json');
const config = require('./config.json');

const parse = (data, topics, interface, eventName, event) => {
  // https://docs.opensea.io/reference/create-an-order
  // https://docs.opensea.io/reference/seaport-enums
  // https://docs.opensea.io/reference/seaport-overview

  // offer array -> 1 item being a currency
  // conisderation array -> 2-3 items where:
  // first = the asset,
  // second = opensea fee,
  // third = optional collection fee

  // note: still missing examples of itemType 4 & 5
  const {
    offerer,
    recipient,
    offer: [
      {
        itemType: itemTypeO,
        token: tokenO,
        identifier: identifierO,
        amount: amountO,
      },
    ],
    consideration: [
      { token: tokenC, identifier: identifierC, amount: amountC },
    ],
  } = interface.decodeEventLog(eventName, data, topics);

  let collection;
  let tokenId;
  let paymentToken;
  let ethSalePrice;
  let nftAmount;
  let seller;
  let buyer;
  const iType = Number(itemTypeO);

  // itemType 0 = native (eth): doesn't contain `consideration` data
  // however, seems like tx which have that itemType also emit an additional
  // itemType 2/3 event which has all details
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
  // combing the relevant events
  abi: [
    ...abiWyvern.filter(
      (e) =>
        e.type === 'event' &&
        config.events
          .filter((c) => c.contractName === 'Wyvern')
          .map((c) => c.name)
          .includes(e.name)
    ),
    ...abiSeaport.filter(
      (e) =>
        e.type === 'event' &&
        config.events
          .filter((c) => c.contractName === 'Seaport')
          .map((c) => c.name)
          .includes(e.name)
    ),
  ],
  config,
  parse,
};
