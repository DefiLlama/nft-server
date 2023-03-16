const abi = require('./abi.json');
const config = require('./config.json');

const parse = (decodedData, event, interface) => {
  const { newLeftFill } = decodedData;

  // decoding method input args cause event data only contains the sale price
  const txData = `0x${event.tx_data}`;
  const funcSigHash = txData.slice(0, 10);

  const functionSignaturesHashes = {
    directAcceptBid: '0x67d49a3b',
    directPurchase: '0x0d5f7d35',
    matchOrders: '0xe99a3f80',
  };

  if (!Object.values(functionSignaturesHashes).includes(funcSigHash)) return {};

  const txDataDecoded = interface.decodeFunctionData(funcSigHash, txData);

  let collection;
  let tokenId;
  let amount;
  let seller;
  let buyer;
  let paymentToken;

  // --- directAcceptBid
  if (funcSigHash === functionSignaturesHashes['directAcceptBid']) {
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
  } else if (funcSigHash === functionSignaturesHashes['directPurchase']) {
    const {
      direct: {
        sellOrderMaker,
        sellOrderNftAmount: amount,
        nftData,
        paymentToken,
      },
    } = txDataDecoded;
    // --- matchOrders
  } else if (funcSigHash === functionSignaturesHashes['matchOrders']) {
    const {
      orderLeft: { maker, taker, data },
    } = txDataDecoded;
  }

  const salePrice = newLeftFill.toString() / 1e18;

  return {
    collection,
    tokenId,
    amount,
    salePrice,
    ethSalePrice: salePrice,
    usdSalePrice: salePrice * event.price,
    paymentToken,
    seller,
    buyer,
  };
};

module.exports = { abi, config, parse };
