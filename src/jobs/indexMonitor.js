const monitor = require('./monitor');
const monitorFloor = require('./monitorFloor');

const freq = 15 * 60 * 1000;

const startJobs = () => {
  setInterval(async () => {
    console.log(`running monitor job ${new Date()}...`);
    await monitor();
  }, freq);

  setInterval(async () => {
    console.log(`running monitorFloor job ${new Date()}...`);
    await monitorFloor();
  }, freq);
};

startJobs();
