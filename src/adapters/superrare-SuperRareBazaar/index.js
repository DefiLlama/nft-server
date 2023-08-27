const { stripZerosLeft } = require('ethers');

const abi = require('./abi.json');
const config = require('./config.json');
const { getPrice } = require('../../utils/price');

const parse = async (decodedData, event) => {
  const {
    _originContract,
    _buyer,
    _seller,
    _currencyAddress,
    _amount,
    _tokenId,
    _bidder,
  } = decodedData;

  const prices = await getPrice(event, _currencyAddress, _amount);

  return {
    collection: _originContract ?? stripZerosLeft(`0x${event.topic_1}`),
    tokenId: _tokenId,
    amount: 1,
    salePrice: prices.price,
    ethSalePrice: prices.ethPrice,
    usdSalePrice: prices.usdPrice,
    paymentToken: _currencyAddress,
    seller: _seller,
    buyer: _buyer ?? _bidder,
  };
};

module.exports = { abi, config, parse };
