const abi = require('./abi.json');
const config = require('./config.json');

const parse = (decodedData, event) => {
  const {
    bidUser,
    currency,
    collection,
    itemIds,
    amounts,
    feeAmounts,
    feeRecipients,
  } = decodedData;

  console.log(event.transaction_hash, feeRecipients);

  const salePrice =
    feeAmounts.reduce((acc, val) => acc + val, BigInt(0)).toString() / 1e18;

  const seller =
    event.topic_0 ===
    '9aaa45d6db2ef74ead0751ea9113263d1dec1b50cea05f0ca2002cb8063564a4' // takerAsk
      ? decodedData.askUser
      : event.topic_0 ===
        '3ee3de4684413690dee6fff1a0a4f92916a1b97d1c5a83cdf24671844306b2e3' // takerBid
      ? decodedData.feeRecipients[0]
      : '';

  // royalty data
  const royaltyRecipient = feeRecipients[1];
  // The first represents the ETH value sent to the Buyer/Seller
  // The second represents the creator fees (for now this is set to 0)
  // The final number in the array is the protocol fee (platform fee) which should now be 0.5% flat.
  const royaltyFeeEth = feeAmounts[1].toString() / 1e18;
  const royaltyFeeUsd = royaltyFeeEth * event.price;

  return {
    collection,
    tokenId: itemIds[0],
    amount: amounts[0],
    salePrice,
    ethSalePrice: salePrice,
    usdSalePrice: salePrice * event.price,
    paymentToken: currency,
    seller,
    buyer: bidUser,
    royaltyRecipient,
    royaltyFeeEth,
    royaltyFeeUsd,
  };
};

module.exports = {
  abi,
  config,
  parse,
};
