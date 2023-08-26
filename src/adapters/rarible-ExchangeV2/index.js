const { stripZerosLeft } = require('ethers');

const abi = require('./abi.json');
const config = require('./config.json');
const { nftTransferEvents, nullAddress } = require('../../utils/params');
const getHistoricalTokenPrice = require('../../utils/price');

const parse = async (decodedData, event, events) => {
  // remove potential lazy mint and match on transaction_hash
  const transfers = events.filter(
    (e) =>
      e.topic_1 !==
        '0000000000000000000000000000000000000000000000000000000000000000' &&
      e.transaction_hash === event.transaction_hash
  );

  // erc20 transfers
  const transfersERC20 = transfers.filter(
    (e) =>
      e.topic_0 === nftTransferEvents['erc721_Transfer'] && e.topic_3 === null
  );
  const transfersERC20LogIndices = transfersERC20.map((i) => i.log_index);

  // erc721/erc1155 transfers
  let transfersNFT = transfers.filter(
    (e) => !transfersERC20LogIndices.includes(e.log_index)
  );

  // some contracts have bugs like this one 0x2aF75676692817d85121353f0D6e8E9aE6AD5576
  // which emits both erc1155 and er721 transfer events for the same tokenId. -> remove duplicated entries
  transfersNFT = transfersNFT.filter(
    (obj, index, self) =>
      index ===
      self.findIndex((el) => el.contract_address === obj.contract_address)
  );

  // find the first transfer event which has the from address in either topic_1 - topic_3
  // so we catch both cases of erc721 transfer and erc1155 TransferSingle
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

  let tokenId;
  let buyer;
  let seller;
  if (transferEventNFT.topic_0 === nftTransferEvents['erc721_Transfer']) {
    seller = stripZerosLeft(`0x${transferEventNFT.topic_1}`);
    buyer = stripZerosLeft(`0x${transferEventNFT.topic_2}`);
    tokenId = BigInt(`0x${transferEventNFT.topic_3}`);
  } else if (
    transferEventNFT.topic_0 === nftTransferEvents['erc1155_TransferSingle']
  ) {
    tokenId = BigInt(`0x${transferEventNFT.data.slice(0, 64)}`);
    seller = stripZerosLeft(`0x${transferEventNFT.topic_2}`);
    buyer = stripZerosLeft(`0x${transferEventNFT.topic_3}`);
  }

  const { newLeftFill } = decodedData;

  const weth = 'c02aaa39b223fe8d0a0e5c4f27ead9083c756cc2';

  const amount = newLeftFill.toString();

  let salePrice;
  let ethSalePrice;
  let usdSalePrice;
  let paymentToken;

  const erc20 = transfersERC20.length
    ? transfersERC20[0].contract_address
    : undefined;

  if (transfersERC20.length && erc20 !== weth) {
    ({ salePrice, ethSalePrice, usdSalePrice, tokenPriceUsd } =
      await getHistoricalTokenPrice(event, `0x${erc20}`, amount));
    paymentToken = erc20;
  } else {
    salePrice = ethSalePrice = amount / 1e18;
    usdSalePrice = ethSalePrice * event.price;
    paymentToken = erc20 === weth ? weth : nullAddress;
  }

  return {
    collection: transferEventNFT.contract_address,
    tokenId,
    amount: 1,
    salePrice,
    ethSalePrice,
    usdSalePrice,
    paymentToken,
    seller,
    buyer,
  };
};

module.exports = { abi, config, parse };
