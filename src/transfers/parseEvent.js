const { stripZerosLeft } = require('ethers');

const { getEvents } = require('./queries');
const { nftTransferEvents } = require('../utils/params');

const nullAddress = '0x0000000000000000000000000000000000000000';

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
    fromAddress = stripZerosLeft(`0x${event.topic_1}`);
    toAddress = stripZerosLeft(`0x${event.topic_2}`);
    tokenId = BigInt(`0x${event.topic_3}`);
    amount = 1;
  } else if (event.topic_0 === nftTransferEvents['erc1155_TransferSingle']) {
    tokenId = BigInt(`0x${event.data.slice(0, 64)}`);
    fromAddress = stripZerosLeft(`0x${event.topic_2}`);
    toAddress = stripZerosLeft(`0x${event.topic_3}`);
    amount = BigInt(`0x${event.data.slice(64)}`);
  }

  const { topic_1, topic_2, topic_3, data, contract_address, ...rest } = event;

  return {
    ...rest,
    collection,
    tokenId,
    fromAddress: fromAddress === '0x' ? nullAddress : fromAddress,
    toAddress: toAddress === '0x' ? nullAddress : toAddress,
    amount,
  };
};

module.exports = parseEvent;
