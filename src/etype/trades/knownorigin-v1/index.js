const abi = require('./abi.json');
const config = require('./config.json');

const nullAddress = '0x0000000000000000000000000000000000000000';

const parse = (decodedData, event) => {
  // the Purchase event on this contract seems to be lazy mints only
  // and the seller is the null address (the actual nft creator address not part of the events)
  const { _tokenId, _buyer, _priceInWei } = decodedData;

  const salePrice = _priceInWei.toString() / 1e18;

  return {
    collection: event.contract_address,
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
