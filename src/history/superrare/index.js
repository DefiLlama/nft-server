const abi = require('../../adapters/superrare/abi.json');
const config = require('./config.json');
const getHistoricalTokenPrice = require('../../utils/price');

const ethPaymentTokens = [
  '0000000000000000000000000000000000000000',
  'c02aaa39b223fe8d0a0e5c4f27ead9083c756cc2',
].map((i) => `0x${i}`);

const getPrice = async (currencyAddress, amount, event) => {
  let price;
  let ethPrice;
  let usdPrice;

  const paymentInEth = ethPaymentTokens.includes(
    currencyAddress?.toLowerCase()
  );

  if (paymentInEth) {
    price = ethPrice = amount.toString() / 1e18;
    usdPrice = ethPrice * event.price;
  } else {
    const prices = await getHistoricalTokenPrice(
      event,
      currencyAddress,
      amount
    );
    price = prices.salePrice;
    ethPrice = prices.ethSalePrice;
    usdPrice = prices.usdSalePrice;
  }

  return { price, ethPrice, usdPrice };
};

const parse = async (decodedData, event) => {
  const eventType = config.events.find(
    (e) => e.signatureHash === `0x${event.topic_0}`
  )?.name;

  if (eventType === 'AuctionBid') {
    const { _contractAddress, _bidder, _tokenId, _currencyAddress, _amount } =
      decodedData;

    const { price, ethPrice, usdPrice } = await getPrice(
      _currencyAddress,
      _amount,
      event
    );

    return {
      collection: _contractAddress,
      tokenId: _tokenId,
      currencyAddress: _currencyAddress,
      price,
      ethPrice,
      usdPrice,
      userAddress: _bidder,
      eventType,
    };
  } else if (eventType === 'CancelAuction') {
    const { _contractAddress, _tokenId, _auctionCreator } = decodedData;

    return {
      collection: _contractAddress,
      tokenId: _tokenId,
      userAddress: _auctionCreator,
      eventType,
    };
  } else if (['CancelOffer', 'OfferPlaced'].includes(eventType)) {
    const { _originContract, _bidder, _currencyAddress, _amount, _tokenId } =
      decodedData;

    const { price, ethPrice, usdPrice } = await getPrice(
      _currencyAddress,
      _amount,
      event
    );

    return {
      collection: _originContract,
      tokenId: _tokenId,
      currencyAddress: _currencyAddress,
      userAddress: _bidder,
      price,
      ethPrice,
      usdPrice,
      eventType,
    };
  } else if (eventType === 'NewAuction') {
    const {
      _contractAddress,
      _tokenId,
      _auctionCreator,
      _currencyAddress,
      _startingTime,
      _minimumBid,
    } = decodedData;

    const { price, ethPrice, usdPrice } = await getPrice(
      _currencyAddress,
      _minimumBid,
      event
    );

    return {
      collection: _contractAddress,
      tokenId: _tokenId,
      userAddress: _auctionCreator,
      currencyAddress: _currencyAddress,
      startTime: _startingTime,
      price,
      ethPrice,
      usdPrice,
      eventType,
    };
  } else if (eventType === 'SetSalePrice') {
    const {
      _originContract,
      _currencyAddress,
      _amount,
      _tokenId,
      _splitRecipients,
    } = decodedData;

    const { price, ethPrice, usdPrice } = await getPrice(
      _currencyAddress,
      _amount,
      event
    );

    return {
      collection: _originContract,
      tokenId: _tokenId,
      userAddress: _splitRecipients.length ? _splitRecipients[0] : null,
      currencyAddress: _currencyAddress,
      price,
      ethPrice,
      usdPrice,
      eventType,
    };
  }
};

module.exports = { abi, config, parse };
