const abi = require('./abi.json');
const config = require('./config.json');

const parse = (data, topics, interface, eventName, event) => {
  const { newLeftFill } = interface.decodeEventLog(eventName, data, topics);

  // decoding method input args cause event data only contains the sale price
  const txData = `0x${event.tx_data}`;
  const funcSigHash = txData.slice(0, 10);
  const {
    direct: {
      sellOrderMaker,
      sellOrderNftAmount,
      nftData,
      paymentToken,
      sellOrderData,
      buyOrderData,
    },
  } = interface.decodeFunctionData(funcSigHash, txData);

  const ethSalePrice = newLeftFill.toString() / 1e18;

  return {
    collection: 'test',
    tokenId: 'test',
    amount: sellOrderNftAmount,
    ethSalePrice,
    usdSalePrice: ethSalePrice * event.price,
    paymentToken,
    seller: 'test',
    buyer: 'test',
  };
};

module.exports = { abi, config, parse };
