const { stripZerosLeft } = require('ethers');

const abi = require('./abi.json');
const config = require('./config.json');
const { nftTransferEvents } = require('../../../utils/params');

const parse = async (decodedData, event, events) => {
  const { collection, buyer, seller, tokenId } = decodedData;

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

  const salePrice =
    transfersERC20
      .reduce((acc, t) => {
        const d = stripZerosLeft(`0x${t.data}`);
        return acc + BigInt(d === '0x' ? '0x0' : d);
      }, BigInt(0))
      .toString() / 1e18;

  return {
    collection,
    tokenId,
    amount: 1,
    salePrice,
    ethSalePrice: salePrice,
    usdSalePrice: salePrice * event.price,
    paymentToken: '0x0000000000000000000000000000000000000000',
    seller,
    buyer,
  };
};

module.exports = { abi, config, parse };
