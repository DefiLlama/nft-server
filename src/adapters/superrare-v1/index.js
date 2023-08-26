const abi = require('./abi.json');
const config = require('./config.json');
const { nullAddress } = require('../../utils/params');

const parse = async (decodedData, event) => {
  const { _bidder, _buyer, _seller, _amount, _tokenId } = decodedData;

  const salePrice = _amount.toString() / 1e18;

  return {
    collection: event.contract_address,
    tokenId: _tokenId,
    amount: 1,
    salePrice,
    ethSalePrice: salePrice,
    usdSalePrice: salePrice * event.price,
    paymentToken: nullAddress,
    seller: _seller,
    buyer: _buyer ?? _bidder,
  };
};

module.exports = { abi, config, parse };
