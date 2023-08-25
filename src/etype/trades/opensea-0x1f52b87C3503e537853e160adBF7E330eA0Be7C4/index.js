const abi = require('./abi.json');
const config = require('./config.json');

const parse = (decodedData, event, events, interface, trace, traces) => {
  const { nftAddress, tokenId, totalPrice, winner } = decodedData;

  const salePrice = totalPrice.toString() / 1e18;

  const seller = traces.find(
    (t) =>
      t.from_address === config.contracts[0].replace('0x', '').toLowerCase()
  )?.to_address;

  return {
    collection: nftAddress,
    tokenId,
    amount: 1,
    salePrice,
    ethSalePrice: salePrice,
    usdSalePrice: salePrice * event.price,
    paymentToken: '0000000000000000000000000000000000000000',
    seller,
    buyer: winner,
  };
};

module.exports = {
  abi,
  config,
  parse,
};
