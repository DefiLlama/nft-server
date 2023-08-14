const { stripZerosLeft } = require('ethers');

const abi = require('./abi.json');
const config = require('./config.json');
const { nftTransferEvents } = require('../../../utils/params');

const pairFactory = 'a020d57ab0448ef74115c112d18a9c231cc86000';

const parse = (decodedData, event, events, interface, trace, traces) => {
  if (!traces.length) return {};

  const paymentToken = '0x0000000000000000000000000000000000000000';
  const amount = 1;

  // filter transfers to sudoswap only using info from traces
  const transfers = events.filter(
    (e) => e.transaction_hash === event.transaction_hash
  );

  // to prevent double counting -> get unique from_address
  const uniqueFrom = [
    ...new Set(
      traces
        .filter((t) => t.to_address === pairFactory)
        .map((t) => t.from_address)
    ),
  ];

  // erc721: topic_1 (from), topic_2 (to)
  // erc1155: topic_2 (from), topic_3 (to)
  const sudoTransfers = transfers.filter(
    (t) =>
      uniqueFrom.includes(stripZerosLeft(`0x${t.topic_1}`).replace('0x', '')) ||
      uniqueFrom.includes(stripZerosLeft(`0x${t.topic_2}`).replace('0x', '')) ||
      uniqueFrom.includes(stripZerosLeft(`0x${t.topic_3}`).replace('0x', ''))
  );

  const nbPairFactoryIn = traces.filter(
    (t) => t.to_address === pairFactory
  ).length;

  let traceEthSumScaled;
  let mapping = {};

  if (nbPairFactoryIn === 1) {
    let tracesFiltered = traces.filter((t) =>
      uniqueFrom.includes(t.from_address)
    );
    tracesFiltered =
      tracesFiltered.length > 2 ? tracesFiltered.slice(0, 1) : tracesFiltered;

    traceEthSumScaled =
      tracesFiltered.map((i) => i.value).reduce((acc, val) => acc + val, 0) /
      1e18;
  } else {
    // get each unique from_address from traces.
    // then filter the transfer array to contain only those and do a count
    // each. then scale the sum of each trace group by the nb of transfer counts
    for (const u of uniqueFrom) {
      const transfersPerCollection = sudoTransfers.filter(
        (t) =>
          t.topic_1.includes(u) ||
          t.topic_2.includes(u) ||
          t.topic_3.includes(u)
      );

      const count = transfersPerCollection.length;
      let tracesFiltered = traces.filter((t) => t.from_address === u);
      // note: sudo v2 seems to have slightly different structure if more than 2 traces
      // -> first one matches the emitted event amount
      tracesFiltered =
        tracesFiltered.length > 2 ? tracesFiltered.slice(0, 1) : tracesFiltered;
      const traceEthSumScaled =
        tracesFiltered.map((i) => i.value).reduce((acc, val) => acc + val, 0) /
        1e18 /
        count;

      mapping[u] = traceEthSumScaled;
    }
  }

  // ignoring case of aggregators rn
  return sudoTransfers.map((e) => {
    let tokenId;

    let seller;
    let buyer;
    if (e.topic_0 === nftTransferEvents['erc721_Transfer']) {
      seller = stripZerosLeft(`0x${e.topic_1}`);
      buyer = stripZerosLeft(`0x${e.topic_2}`);
      tokenId = BigInt(`0x${e.topic_3}`);
    } else if (e.topic_0 === nftTransferEvents['erc1155_TransferSingle']) {
      seller = stripZerosLeft(`0x${e.topic_2}`);
      buyer = stripZerosLeft(`0x${e.topic_3}`);
      tokenId = BigInt(`0x${e.data.slice(0, 64)}`);
    }

    let salePrice;
    let ethSalePrice;
    let usdSalePrice;

    const collection = e.contract_address;

    if (nbPairFactoryIn === 1) {
      salePrice = ethSalePrice = traceEthSumScaled / sudoTransfers.length;
    } else {
      salePrice = ethSalePrice =
        mapping[buyer.replace('0x', '')] ?? mapping[seller.replace('0x', '')];
    }

    usdSalePrice = ethSalePrice * event.price;

    return {
      collection,
      tokenId,
      amount,
      salePrice,
      ethSalePrice,
      usdSalePrice,
      paymentToken,
      seller,
      buyer,
    };
  });
};

module.exports = { abi, config, parse };
