const abi = require('./abi.json');
const config = require('./config.json');
const getHistoricalTokenPrice = require('../../utils/price');

const ethPaymentTokens = [
  '0x0000000000000000000000000000000000000000',
  '0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2',
];

const parse = async (decodedData, event) => {
  const {
    listing: {
      owner,
      tradeIntendedFor,
      listingAssets: { paymentTokens, amounts },
    },
    offeredAssets: { tokens, tokenIds },
  } = decodedData;

  const collection = tokens[0];
  const tokenId = tokenIds[0];
  const seller = tradeIntendedFor;
  const buyer = owner;

  const paymentToken = paymentTokens[0]?.toLowerCase();
  const amount = amounts[0];
  let royaltyRecipient;
  let royaltyFeeEth;
  let royaltyFeeUsd;

  const paymentInEth = ethPaymentTokens.includes(paymentToken);

  if (paymentInEth) {
    salePrice = ethSalePrice = amount.toString() / 1e18;
    usdSalePrice = ethSalePrice * event.price;
  } else {
    ({ salePrice, ethSalePrice, usdSalePrice, _ } =
      await getHistoricalTokenPrice(event, paymentToken, amount));
  }

  return {
    collection,
    tokenId,
    amount: 1,
    salePrice,
    ethSalePrice,
    usdSalePrice,
    paymentToken,
    seller,
    buyer,
    royaltyRecipient,
    royaltyFeeEth,
    royaltyFeeUsd,
  };
};

module.exports = { abi, config, parse };
