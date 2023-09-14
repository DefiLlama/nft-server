const { getEvents } = require('./queriesTransfers');
const { nftTransferEvents } = require('../utils/params');

const parseEvent = async (task, startBlock, endBlock) => {
  const events = await getEvents(task, startBlock, endBlock);
  if (!events.length) return [];

  const parsedEvents = events
    .map((e) => parse(e))
    .filter((e) => e.transaction_hash);

  return parsedEvents;
};

const parse = (event) => {
  if (!event.topic_1) return {};

  const collection = event.contract_address;
  let tokenId;
  let fromAddress;
  let toAddress;
  let amount;
  if (event.topic_0 === nftTransferEvents['erc721_Transfer']) {
    // we encoded topic values from 32bytea into hex string in sql query.
    // the topics have hex string character length of 64.
    // the last 40characters (start 24) is the address
    // note: topic3 is either the tokenId or the toAddress, depending if
    // its an erc721 or erc1155
    fromAddress = event.topic_1.substring(24);
    toAddress = event.topic_2.substring(24);
    tokenId = BigInt(`0x${event.topic_3}`);
    amount = 1;
  } else if (event.topic_0 === nftTransferEvents['erc1155_TransferSingle']) {
    tokenId = BigInt(`0x${event.data.slice(0, 64)}`);
    fromAddress = event.topic_2.substring(24);
    toAddress = event.topic_3.substring(24);
    amount = BigInt(`0x${event.data.slice(64)}`);
  }

  const { topic_1, topic_2, topic_3, data, contract_address, ...rest } = event;

  return {
    ...rest,
    collection,
    tokenId,
    fromAddress,
    toAddress,
    amount,
  };
};

module.exports = parseEvent;
