const floor = require('./floor');
const washTrades = require('./washTrades');
const orderbook = require('./orderbook');
const trimOrderbook = require('./trimOrderbook');
const symbol = require('./symbol');
const { tokenStandard } = require('./tokenStandard');
const exchangeVolume = require('./exchangeVolume');
const collectionsFloorPrice = require('./collectionsFloorPrice');

const startJobs = () => {
  setInterval(async () => {
    console.log(`running floor job ${new Date()}...`);
    await floor();
  }, 60 * 60 * 1000);

  setInterval(async () => {
    console.log(`running washTrades job ${new Date()}...`);
    await washTrades();
  }, 60 * 60 * 1000);

  setInterval(async () => {
    console.log(`running orderbook job ${new Date()}...`);
    await orderbook();
  }, 12 * 60 * 60 * 1000);

  setInterval(async () => {
    console.log(`running trimOrderbook job ${new Date()}...`);
    await trimOrderbook();
  }, 60 * 60 * 1000);

  setInterval(async () => {
    console.log(`running symbol job ${new Date()}...`);
    await symbol();
  }, 24 * 60 * 60 * 1000);

  setInterval(async () => {
    console.log(`running tokenStandard job ${new Date()}...`);
    await tokenStandard();
  }, 60 * 60 * 1000);

  setInterval(async () => {
    console.log(`running exchangeVolume job ${new Date()}...`);
    await exchangeVolume();
  }, 24 * 60 * 60 * 1000);

  setInterval(async () => {
    console.log(`running collectionsFloorPrice job ${new Date()}...`);
    await collectionsFloorPrice();
  }, 60 * 60 * 1000);
};

startJobs();
