const abi = require('./abi.json');
const config = require('./config.json');
const { nullAddress } = require('../../utils/params');

const parse = (decodedData, event) => {
  // the Purchase event on this contract seems to be lazy mints only
  // and the seller is the null address (the actual nft creator address not part of the events)
  const { _tokenId, _buyer, _priceInWei } = decodedData;

  const salePrice = _priceInWei.toString() / 1e18;

  return {
    collection: '0xFBeef911Dc5821886e1dda71586d90eD28174B7d',
    tokenId: _tokenId,
    amount: 1,
    salePrice,
    ethSalePrice: salePrice,
    usdSalePrice: salePrice * event.price,
    paymentToken: nullAddress,
    seller: nullAddress,
    buyer: _buyer,
  };
};

module.exports = { abi, config, parse };
