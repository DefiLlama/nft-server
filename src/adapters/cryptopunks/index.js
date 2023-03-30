const { stripZerosLeft } = require('ethers');

const abi = require('./abi.json');
const config = require('./config.json');

const parse = (decodedData, event, events, interface) => {
  // we search for the matching erc20 transfer event which contains the buyer info
  const transferEvent = events.find(
    (e) =>
      e.transaction_hash === event.transaction_hash &&
      e.topic_1 === event.topic_2
  );

  if (!transferEvent) return {};

  const buyer = stripZerosLeft(`0x${transferEvent.topic_2}`);

  // tx input data contains sale price
  const txData = `0x${event.tx_data}`;
  const funcSigHash = txData.slice(0, 10);
  let minPrice;
  try {
    ({ minPrice } = interface.decodeFunctionData(funcSigHash, txData));
  } catch (err) {
    console.log(err);
    return {};
  }

  // tokenId and seller
  const { punkIndex, fromAddress, value } = decodedData;

  const price = minPrice ?? value;
  const salePrice = price?.toString() / 1e18;

  return {
    collection: config.contracts[0],
    tokenId: punkIndex,
    amount: 1,
    salePrice,
    ethSalePrice: salePrice,
    usdSalePrice: salePrice * event.price,
    paymentToken: '0x0000000000000000000000000000000000000000',
    seller: fromAddress,
    buyer,
  };
};

module.exports = { abi, config, parse };
