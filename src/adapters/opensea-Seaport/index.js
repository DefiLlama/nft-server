const abi = require('./abi.json');
const config = require('./config.json');
const { getHistoricalTokenPrice } = require('../../utils/price');
const { nullAddress, ethPaymentTokens } = require('../../utils/params');

const parse = async (decodedData, event) => {
  // https://docs.opensea.io/reference/create-an-order
  // https://docs.opensea.io/reference/seaport-enums
  // https://docs.opensea.io/reference/seaport-overview

  // offer array -> 1 item being a currency
  // conisderation array -> 2-3 items where:
  // first = the asset,
  // second = opensea fee,
  // third = optional collection fee

  // itemType 0 = native (eth)
  // itemType 1 = erc20
  // itemType 2 = erc721
  // itemType 3 = erc1155
  // note: still missing examples of itemType 4 & 5

  const { zone, offerer, recipient, offer, consideration } = decodedData;

  // there are instances where required fields from offer and consideration are undefined
  // -> destructure based on condition
  const {
    itemType: itemTypeO,
    token: tokenO,
    identifier: identifierO,
    amount: amountO,
  } = offer.length > 0 ? offer[0] : {};

  // itemtype is required to parse the event
  if (!itemTypeO) return {};

  const {
    token: tokenC,
    identifier: identifierC,
    amount: amountC,
  } = consideration.length > 0 ? consideration[0] : {};

  let collection;
  let tokenId;
  let paymentToken;
  let salePrice;
  let ethSalePrice;
  let usdSalePrice;
  let nftAmount;
  let seller;
  let buyer;
  let tokenPriceUsd;

  const iType = Number(itemTypeO);

  if (iType === 1) {
    // smol nb of weird samples for itemType 1
    // eg 0x05b6a971ac5a41870d14926f1d8b368ad2123bd6927cad7703951dfabc01d979
    // where amountC is identical to the sale price
    if (amountC > 1e6) return {};

    const paymentInEth = ethPaymentTokens.includes(tokenO?.toLowerCase());

    if (paymentInEth) {
      salePrice = ethSalePrice = amountO.toString() / 1e18;
      usdSalePrice = ethSalePrice * event.price;
    } else {
      ({ salePrice, ethSalePrice, usdSalePrice, tokenPriceUsd } =
        await getHistoricalTokenPrice(event, tokenO, amountO));
    }

    collection = tokenC;
    tokenId = identifierC;
    nftAmount = amountC;
    paymentToken = tokenO;
    seller = recipient;
    buyer = offerer;
  } else if (iType === 2 || iType === 3) {
    // some cases have zone = null address. dropping these cause there is a "duplicated" event
    // which contains all relevant data
    if (zone === nullAddress) return {};
    const paymentInEth = ethPaymentTokens.includes(tokenC?.toLowerCase());

    if (paymentInEth) {
      salePrice = ethSalePrice =
        consideration
          .reduce((total, c) => c.amount + total, BigInt(0))
          .toString() / 1e18;
      usdSalePrice = ethSalePrice * event.price;
    } else {
      try {
        ({ salePrice, ethSalePrice, usdSalePrice, tokenPriceUsd } =
          await getHistoricalTokenPrice(event, tokenC, amountC));
      } catch (err) {
        console.log('api price call failed');
      }
    }

    collection = tokenO;
    tokenId = identifierO;
    nftAmount = amountO;
    paymentToken = tokenC;
    seller = offerer;
    buyer = recipient;
  }

  let royaltyRecipient;
  let royaltyFeeEth;
  let royaltyFeeUsd;
  if (consideration.length > 2) {
    ({ amount: royaltyFee, recipient: royaltyRecipient } = consideration[2]);

    if (ethPaymentTokens.includes(paymentToken?.toLowerCase())) {
      royaltyFeeEth = royaltyFee.toString() / 1e18;
      royaltyFeeUsd = royaltyFeeEth * event.price;
    } else {
      royaltyFee = royaltyFee.toString() / 1e18;
      royaltyFeeUsd = royaltyFee * tokenPriceUsd;
      royaltyFeeEth = royaltyFeeUsd / event.price;
    }
  }

  return {
    collection,
    tokenId,
    amount: nftAmount,
    salePrice,
    ethSalePrice,
    usdSalePrice,
    paymentToken,
    seller: seller === nullAddress ? event.from_address : seller,
    buyer: buyer === nullAddress ? event.from_address : buyer,
    royaltyRecipient,
    royaltyFeeEth,
    royaltyFeeUsd,
  };
};

module.exports = {
  abi,
  config,
  parse,
};
