const floor = require('./floor');
const monitor = require('./monitor');
const washTrades = require('./washTrades');

const startJobs = () => {
  setInterval(async () => {
    console.log(`running floor job ${new Date()}...`);
    await floor();
  }, 5 * 60 * 1000);

  setInterval(async () => {
    console.log(`running monitor job ${new Date()}...`);
    await monitor();
  }, 15 * 60 * 1000);

  setInterval(async () => {
    console.log(`running washTrades job ${new Date()}...`);
    await washTrades();
  }, 60 * 60 * 1000);
};

startJobs();
