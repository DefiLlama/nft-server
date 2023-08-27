const { stripZerosLeft } = require('ethers');

const abi = require('./abi.json');
const config = require('./config.json');
const { nullAddress } = require('../../utils/params');

const parse = async (decodedData, event) => {
  let _originContract;
  let _buyer;
  let _bidder;
  let _tokenId;
  let _seller;
  let _amount;

  // for some events we don't have an abi -> parse event manually
  if (
    `0x${event.topic_0}` ===
    config.events.find((e) => e.name === 'settleAuctionPH').signatureHash
  ) {
    _originContract = stripZerosLeft(`0x${event.topic_1}`);
    _buyer = stripZerosLeft(`0x${event.topic_2}`);
    _tokenId = BigInt(`0x${event.topic_3}`);
    _seller = stripZerosLeft(`0x${event.data.slice(0, 64)}`);
    _amount = BigInt(`0x${event.data.slice(64)}`);
  } else {
    ({ _originContract, _buyer, _bidder, _seller, _amount, _tokenId } =
      decodedData);
  }

  const salePrice = _amount.toString() / 1e18;

  return {
    collection: _originContract,
    tokenId: _tokenId,
    amount: 1,
    salePrice,
    ethSalePrice: salePrice,
    usdSalePrice: salePrice * event.price,
    paymentToken: nullAddress,
    seller: _seller,
    buyer: _buyer ?? _bidder,
  };
};

module.exports = { abi, config, parse };
