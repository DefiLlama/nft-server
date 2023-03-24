const axios = require('axios');

const abi = require('./abi.json');
const config = require('./config.json');

const getTokenPrice = async (event, token, amount) => {
  // ping our price api
  const timestamp = Math.round(Number(event.block_time) / 1000);
  const key = `ethereum:${token}`;
  const url = 'https://coins.llama.fi/prices/historical';
  const response = (await axios.get(`${url}/${timestamp}/${key}`)).data?.coins[
    key
  ];

  const salePrice = amount?.toString() / 10 ** response?.decimals;
  const usdSalePrice = salePrice * response?.price;
  const ethSalePrice = usdSalePrice / event.price;

  return { salePrice, ethSalePrice, usdSalePrice };
};

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

  // on opensea users can pay in other tokens than eth, which means for that cases we pull
  // historical token price from our api
  const ethPaymentTokens = [
    '0000000000000000000000000000000000000000',
    'c02aaa39b223fe8d0a0e5c4f27ead9083c756cc2', // weth
    '0000000000a39bb272e79075ade125fd351887ac', // blur bidding pool of eth
  ].map((i) => `0x${i}`);

  const { offerer, recipient, offer, consideration } = decodedData;

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
      ({ salePrice, ethSalePrice, usdSalePrice } = await getTokenPrice(
        event,
        tokenO,
        amountO
      ));
    }

    collection = tokenC;
    tokenId = identifierC;
    nftAmount = amountC;
    paymentToken = tokenO;
    seller = recipient;
    buyer = offerer;
  } else if (iType === 2 || iType === 3) {
    const paymentInEth = ethPaymentTokens.includes(tokenC?.toLowerCase());

    if (paymentInEth) {
      salePrice = ethSalePrice = amountC.toString() / 1e18;
      usdSalePrice = ethSalePrice * event.price;
    } else {
      ({ salePrice, ethSalePrice, usdSalePrice } = await getTokenPrice(
        event,
        tokenC,
        amountC
      ));
    }

    collection = tokenO;
    tokenId = identifierO;
    nftAmount = 1; // if multiple -> each in separate event
    paymentToken = tokenC;
    seller = offerer;
    buyer = recipient;
  }

  return {
    collection,
    tokenId,
    amount: nftAmount,
    salePrice,
    ethSalePrice,
    usdSalePrice,
    paymentToken,
    seller,
    buyer,
  };
};

module.exports = {
  abi,
  config,
  parse,
};