const { stripZerosLeft } = require('ethers');

const abi = require('./abi.json');
const config = require('./config.json');
const getHistoricalTokenPrice = require('../../../utils/price');

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

  let salePrice;
  let ethSalePrice;
  let usdSalePrice;

  const ethPaymentTokens = [
    '0000000000000000000000000000000000000000',
    'c02aaa39b223fe8d0a0e5c4f27ead9083c756cc2', // weth
    '0000000000a39bb272e79075ade125fd351887ac', // blur bidding pool of eth
  ].map((i) => `0x${i}`);

  const paymentInEth = ethPaymentTokens.includes(
    _currencyAddress?.toLowerCase()
  );

  if (paymentInEth) {
    salePrice = ethSalePrice = _amount.toString() / 1e18;
    usdSalePrice = ethSalePrice * event.price;
  } else {
    ({ salePrice, ethSalePrice, usdSalePrice } = await getHistoricalTokenPrice(
      event,
      _currencyAddress,
      _amount
    ));
  }

  return {
    collection: _originContract ?? stripZerosLeft(`0x${event.topic_1}`),
    tokenId: _tokenId,
    amount: 1,
    salePrice,
    ethSalePrice,
    usdSalePrice,
    paymentToken: _currencyAddress,
    seller: _seller,
    buyer: _buyer ?? _bidder,
  };
};

module.exports = { abi, config, parse };
