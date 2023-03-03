const abi = require('./abi.json');
const config = require('./config.json');

const parse = (data, topics, interface, eventName, event) => {
  const { nftContract, tokenId, seller, buyer, creatorRev } =
    interface.decodeEventLog(eventName, data, topics);

  const ethSalePrice = creatorRev.toString() / 1e18;

  return {
    collection: nftContract,
    tokenId,
    amount: 1,
    ethSalePrice,
    usdSalePrice: ethSalePrice * event.price,
    paymentToken: '0x0000000000000000000000000000000000000000',
    seller,
    buyer,
  };
};

module.exports = { abi, config, parse };
