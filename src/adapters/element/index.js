const abi = require('./abi.json');
const config = require('./config.json');
const { getPrice } = require('../../utils/price');

const parse = async (decodedData, event) => {
  const {
    maker, taker, nonce, erc20Token, erc20TokenAmount, fees, erc721Token, erc721TokenId
  } = decodedData;

  const prices = await getPrice(event, erc20Token, erc20TokenAmount);

  return {
    collection: erc721Token,
    tokenId: erc721TokenId,
    amount: 1,
    salePrice: prices.price,
    ethSalePrice: prices.ethPrice,
    usdSalePrice: prices.usdPrice,
    paymentToken: erc20Token,
    maker,
    taker,
  };
};

module.exports = { abi, config, parse };
