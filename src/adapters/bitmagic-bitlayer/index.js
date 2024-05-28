const abi = require('./abi.json');
const config = require('./config.json');
// const getEventType = require('../../utils/eventType');
const { nullAddress } = require('../../utils/params');
// const axios = require('axios');
// const axiosRetry = require('axios-retry');
//
// axiosRetry(axios, {
//   retries: 3,
//   retryDelay: axiosRetry.exponentialDelay,
// });


const parse = (decodedData, event) => {
  //const eventType = getEventType(config, event);
  //emit orderItem(_SingleBuyOrder.orderHash, _user, block.timestamp, "cancelBuyOrder", _index, _SingleBuyOrder._buyOrder, new MassOrderItem[](1)[0], 0, 0, 0, new uint256[](0), true);
  //emit orderItem(_temp._orderHash, _temp._user, block.timestamp, "acceptOrder", 0, _SingleBuyOrder._buyOrder, new MassOrderItem[](1)[0], _temp._serviceFee, _temp._royaltyFee, _temp._serviceFee + _temp._royaltyFee, _temp._tokenIdList, _temp._if_cancel_order);
  //emit orderItem(_temp._orderHash, _temp._user, block.timestamp, "acceptOrder", 0, _SingleBuyOrder._buyOrder, new MassOrderItem[](1)[0], _temp._serviceFee, _temp._royaltyFee, _temp._serviceFee + _temp._royaltyFee, _tokenIdList, _temp._if_cancel_order);

  //emit orderItem(_temp._orderHash, _temp._buyerAddress, block.timestamp, "doOrder", _index, new BuyOrderItem[](1)[0], _singleOrder._orderItem, _temp._serviceFee, _temp._royaltyFee, _temp._serviceFee + _temp._royaltyFee, new uint256[](0), true);

  //emit orderItem(_SingleBuyOrder.orderHash, _user, block.timestamp, "cancelBuyOrder", _index, _SingleBuyOrder._buyOrder, new MassOrderItem[](1)[0], 0, 0, 0, new uint256[](0), true);

  //emit orderItem(_singleOrder.orderHash, _user, block.timestamp, "cancelOrder", _index, new BuyOrderItem[](1)[0], _singleOrder._orderItem, 0, 0, 0, new uint[](0), true);

  const {
    _orderHash,
    _user,
    _time,
    _type,
    _index,
    _BuyOrderItem,
    _MassOrderItem,
    _serviceFee,
    _royaltyFee,
    _allFee,
    _tokenIdList,
    _if_cancel_order
  } = decodedData;


  const {
    listingTime,
    endTime,
    chainId,
    nftContract,
    sellerAddress,
    tokenId,
    price
  } = _MassOrderItem;
  const salePrice = price?.toString() / 1e18;
  const usdSalePrice = salePrice * 70000;
  const ethSalePrice = usdSalePrice / 4000;
  return {
    collection: nftContract,
    tokenId: tokenId,
    amount: 1,
    salePrice: salePrice,
    ethSalePrice: ethSalePrice,
    usdSalePrice: usdSalePrice,
    paymentToken: nullAddress,
    seller: sellerAddress,
    buyer: _user
  };

};

module.exports = { abi, config, parse };
