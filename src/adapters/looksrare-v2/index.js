const abi = require('./abi.json');
const config = require('./config.json');

const parse = (decodedData, event) => {
  const eventType = config.events.find(
    (e) => e.signatureHash === `0x${event.topic_0}`
  )?.name;

  const {
    bidUser,
    currency,
    collection,
    itemIds,
    amounts,
    feeAmounts,
    feeRecipients,
  } = decodedData;

  const salePrice =
    feeAmounts.reduce((acc, val) => acc + val, BigInt(0)).toString() / 1e18;

  const seller =
    eventType === 'TakerAsk'
      ? decodedData.askUser
      : eventType === 'TakerBid'
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
