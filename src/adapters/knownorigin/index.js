const abi = require('./abi.json');
const config = require('./config.json');
const { nftTransferEvents } = require('../../utils/params');

const parse = (decodedData, event, events) => {
  const transfers = events.filter(
    (e) => e.transaction_hash === event.transaction_hash
  );

  // erc20 transfers
  const transfersERC20 = transfers.filter(
    (e) =>
      e.topic_0 === nftTransferEvents['erc721_Transfer'] && e.topic_3 === null
  );
  const transfersERC20LogIndices = transfersERC20.map((i) => i.log_index);

  // erc721/erc1155 transfers
  const transfersNFT = transfers.filter(
    (e) => !transfersERC20LogIndices.includes(e.log_index)
  );

  if (!transfersNFT.length) return {};

  const transferEventNFT =
    transfersNFT?.length === 1
      ? transfersNFT[0]
      : transfersNFT.find(
          (tf) =>
            tf.topic_1.includes(event.from_address) ||
            tf.topic_2.includes(event.from_address) ||
            tf.topic_3.includes(event.from_address)
        );

  if (!transferEventNFT) return {};

  const { _tokenId, _buyer, _currentOwner, _price } = decodedData;

  const seller = _currentOwner;
  const buyer = _buyer;
  const tokenId = _tokenId;
  // price = in eth
  const salePrice = _price.toString() / 1e18;
  let royaltyFeeEth;
  let royaltyFeeUsd;
  let royaltyRecipient;
  const paymentToken = '0000000000000000000000000000000000000000';
  const amount = 1;
  const collection = transferEventNFT.contract_address;

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
    royaltyRecipient,
    royaltyFeeEth,
    royaltyFeeUsd,
  };
};

module.exports = { abi, config, parse };
