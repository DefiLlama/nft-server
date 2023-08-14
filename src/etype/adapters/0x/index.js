const abi = require('./abi.json');
const config = require('./config.json');

const parse = (decodedData, event) => {
  const {
    direction,
    maker,
    taker,
    erc721Token,
    erc721TokenId,
    erc20TokenAmount,
    erc20Token,
  } = decodedData;

  const dir = Number(direction);
  const buyer = dir === 0 ? taker : maker;
  const seller = dir === 0 ? maker : taker;

  // price = in eth
  const salePrice = erc20TokenAmount.toString() / 1e18;

  return {
    collection: erc721Token,
    tokenId: erc721TokenId,
    amount: 1,
    salePrice,
    ethSalePrice: salePrice,
    usdSalePrice: salePrice * event.price,
    paymentToken: erc20Token,
    seller,
    buyer,
  };
};

module.exports = { abi, config, parse };
