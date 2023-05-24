const { stripZerosLeft } = require('ethers');

const abi = require('./abi.json');
const config = require('./config.json');
const { nftTransferEvents } = require('../../utils/params');
const getHistoricalTokenPrice = require('../../utils/price');

const parse = async (decodedData, event, events, interface, trace) => {
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

  // --- collection + tokenId
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
  if (transferEventNFT.topic_0 === nftTransferEvents['erc721_Transfer']) {
    tokenId = BigInt(`0x${transferEventNFT.topic_3}`);
  } else if (
    transferEventNFT.topic_0 === nftTransferEvents['erc1155_TransferSingle']
  ) {
    tokenId = BigInt(`0x${transferEventNFT.data.slice(0, 64)}`);
  }

  const { maker, taker, price } = decodedData;

  // --- sale info
  let paymentToken;
  let salePrice;
  let ethSalePrice;
  let usdSalePrice;
  let tokenPriceUsd;
  let tokenDecimals;

  const nullAddress = '0x0000000000000000000000000000000000000000';
  if (transfersERC20.length) {
    const x = transfersERC20.find((t) => {
      const d = stripZerosLeft(`0x${t.data}`);
      return BigInt(d === '0x' ? '0x0' : d) === price;
    });

    if (x === undefined) return {};
    if (x.contract_address === 'c02aaa39b223fe8d0a0e5c4f27ead9083c756cc2') {
      salePrice = ethSalePrice = price.toString() / 1e18;
      paymentToken = x?.contract_address ?? nullAddress;
      usdSalePrice = salePrice * event.price;
    } else {
      paymentToken = x.contract_address;

      try {
        ({
          salePrice,
          ethSalePrice,
          usdSalePrice,
          tokenPriceUsd,
          tokenDecimals,
        } = await getHistoricalTokenPrice(event, `0x${paymentToken}`, price));
      } catch (err) {
        console.log('api price call failed');
      }
    }
  } else {
    salePrice = ethSalePrice = price.toString() / 1e18;
    paymentToken = nullAddress;
    usdSalePrice = salePrice * event.price;
  }

  // --- royalty data
  // we calculate this via: osWalletTransferAmount - salePrice * 0.025
  // where we get osWalletTransferAmount from:
  // - a) tx-input data in case of direct interactions with the os wyvern contracts
  // - b) traces in case of tx from aggregator

  let royaltyRecipient;
  let royaltyFee;
  let royaltyFeeEth;
  let royaltyFeeUsd;

  let osWalletTransferAmount;
  const osWalletPlatformFee = salePrice * 0.025; // os platform fee
  // a)
  if (config.contracts.includes(`0x${event.to_address}`)) {
    const txData = `0x${event.tx_data.toString('hex')}`;
    const funcSigHash = txData.slice(0, 10);
    const { addrs, uints } = interface.decodeFunctionData(funcSigHash, txData);
    const osWalletPP = Number(uints[0]); // basis point

    if (osWalletPP > 0) {
      const osWalletPct = osWalletPP / 1e4; // in % scaled
      osWalletTransferAmount = salePrice * osWalletPct; // what gets transferred to OS wallet address (=OS fee + optional creator fee)
    } else if (osWalletPP === 0) {
      // some instances where we osWalletPP is 0 even though the os wallet received
      // something, for example: 0xcf43a10f80378887b7261690d41b890aa0ef5026adbc5311b1e187c861653f82
      const osWalletTransfer = transfersERC20.find(
        (e) =>
          e.topic_2 ===
          '0000000000000000000000005b3256965e7c3cf26e11fcaf296dfc8807c01073'
      );

      // also cases with no oswallet transfer at all: 0x4358c887190cc6b0397cadadd7a126a0d535583df5cfd473bd1f6633458dc54d
      const d = osWalletTransfer
        ? stripZerosLeft(`0x${osWalletTransfer?.data}`)
        : '0x';
      osWalletTransferAmount = BigInt(d === '0x' ? '0x0' : d).toString();

      osWalletTransferAmount = tokenDecimals
        ? osWalletTransferAmount / 10 ** tokenDecimals
        : osWalletTransferAmount / 1e18;
    }

    royaltyRecipient = addrs[10];
  } else {
    // b)
    osWalletTransferAmount = tokenDecimals
      ? trace.value / 10 ** tokenDecimals
      : trace.value / 1e18;
  }

  royaltyFee =
    osWalletTransferAmount > 0
      ? osWalletTransferAmount - osWalletPlatformFee
      : 0;

  if (
    paymentToken === nullAddress ||
    paymentToken
      .toLowerCase()
      .includes('c02aaa39b223fe8d0a0e5c4f27ead9083c756cc2')
  ) {
    royaltyFeeEth = royaltyFee;
    royaltyFeeUsd = royaltyFee * event.price;
  } else {
    royaltyFeeUsd = royaltyFee * tokenPriceUsd;
    royaltyFeeEth = royaltyFeeUsd / event.price;
  }

  // --- bundle trades
  // if to_address was wyvern exchange contracts and if more than 1 nft was transferred then
  // it was a bundle trade, for which we scale the total sale price from the ordersMatched event
  // by the nb of nft-transfers (= the individual sales). this is only required for direct tx on os but not
  // for aggregators cause in that case we have 1 sales event per sale

  const numberOfNftsSold = transfersNFT?.length;
  if (
    config.contracts.includes(`0x${event.to_address}`) &&
    numberOfNftsSold > 1
  ) {
    return transfersNFT.map((t) => {
      let tokenId;
      if (t.topic_0 === nftTransferEvents['erc721_Transfer']) {
        tokenId = BigInt(`0x${t.topic_3}`);
      } else if (t.topic_0 === nftTransferEvents['erc1155_TransferSingle']) {
        tokenId = BigInt(`0x${t.data.slice(0, 64)}`);
      }

      return {
        collection: t.contract_address,
        tokenId,
        amount: 1,
        salePrice: salePrice / numberOfNftsSold,
        ethSalePrice: ethSalePrice / numberOfNftsSold,
        usdSalePrice: usdSalePrice / numberOfNftsSold,
        paymentToken,
        seller: maker,
        buyer: taker,
        royaltyRecipient,
        royaltyFeeEth: royaltyFeeEth / numberOfNftsSold,
        royaltyFeeUsd: royaltyFeeUsd / numberOfNftsSold,
      };
    });
  }

  return {
    collection: transferEventNFT.contract_address,
    tokenId,
    amount: 1,
    salePrice,
    ethSalePrice,
    usdSalePrice,
    paymentToken,
    seller: maker,
    buyer: taker,
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
