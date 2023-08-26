const { stripZerosLeft } = require('ethers');

const abi = require('./abi.json');
const config = require('./config.json');
const { nullAddress } = require('../../utils/params');

const pairFactory = 'b16c1342e617a5b6e4b631eb114483fdb289c0a4';

const parse = (decodedData, event, events, interface, trace, traces) => {
  if (!traces.length) return {};

  const paymentToken = nullAddress;
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

  const sudoTransfers = transfers.filter(
    (t) =>
      uniqueFrom.includes(stripZerosLeft(`0x${t.topic_1}`).replace('0x', '')) ||
      uniqueFrom.includes(stripZerosLeft(`0x${t.topic_2}`).replace('0x', ''))
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
      tracesFiltered.length > 2 ? tracesFiltered.slice(1) : tracesFiltered;

    traceEthSumScaled =
      tracesFiltered.map((i) => i.value).reduce((acc, val) => acc + val, 0) /
      1e18;
  } else {
    // get each unique from_address from traces.
    // then filter the transfer array to contain only those and do a count
    // each. then scale the sum of each trace group by the nb of transfer counts
    for (const u of uniqueFrom) {
      const transfersPerCollection = sudoTransfers.filter(
        (t) => t.topic_2.includes(u) || t.topic_1.includes(u)
      );

      const count = transfersPerCollection.length;
      let tracesFiltered = traces.filter((t) => t.from_address === u);
      // note: need to figure out the pattern here, but sometimes multiple entries (call, delegate call)
      // removing the duplicated one
      tracesFiltered =
        tracesFiltered.length > 2 ? tracesFiltered.slice(1) : tracesFiltered;
      const traceEthSumScaled =
        tracesFiltered.map((i) => i.value).reduce((acc, val) => acc + val, 0) /
        1e18 /
        count;

      mapping[u] = traceEthSumScaled;
    }
  }

  // ignoring case of aggregators rn
  return sudoTransfers.map((e) => {
    const seller = stripZerosLeft(`0x${e.topic_1}`);
    const buyer = stripZerosLeft(`0x${e.topic_2}`);
    const collection = e.contract_address;
    const tokenId = BigInt(`0x${e.topic_3}`);

    let salePrice;
    let ethSalePrice;
    let usdSalePrice;

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
