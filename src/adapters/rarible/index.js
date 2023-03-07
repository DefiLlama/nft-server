const abi = require('./abi.json');
const config = require('./config.json');

const parse = (decodedData, event, interface) => {
  const { newLeftFill } = decodedData;

  // decoding method input args cause event data only contains the sale price
  const txData = `0x${event.tx_data}`;
  const funcSigHash = txData.slice(0, 10);

  const txDataDecoded = interface.decodeFunctionData(funcSigHash, txData);

  let collection;
  let tokenId;
  let amount;
  let seller;
  let buyer;
  let paymentToken;

  // --- directAcceptBid
  if (funcSigHash === '0x67d49a3b') {
    const {
      direct: {
        bidMaker,
        bidOrderNftAmount,
        nftData,
        bidPaymentAmount,
        paymentToken,
      },
    } = txDataDecoded;
    // --- directPurchase
  } else if (funcSigHash === '0x0d5f7d35') {
    const {
      direct: {
        sellOrderMaker,
        sellOrderNftAmount: amount,
        nftData,
        paymentToken,
      },
    } = txDataDecoded;
    // --- matchOrders
  } else if (funcSigHash === '0xe99a3f80') {
    const {
      orderLeft: { maker, taker, data },
    } = txDataDecoded;
  }

  const ethSalePrice = newLeftFill.toString() / 1e18;

  return {
    collection,
    tokenId,
    amount,
    ethSalePrice,
    usdSalePrice: ethSalePrice * event.price,
    paymentToken,
    seller,
    buyer,
  };
};

module.exports = { abi, config, parse };
