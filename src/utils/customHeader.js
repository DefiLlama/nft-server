const customHeader = () => {
  const date = new Date();
  date.setMinutes(22);
  if (date < new Date()) {
    // we are past the :22 mark, roll over to next hour
    date.setHours(date.getHours() + 1);
  }

  return {
    'Content-Type': 'application/json',
    Expires: date.toUTCString(),
    'Access-Control-Allow-Origin': '*',
  };
};

const customHeaderFixedCache = (cacheTime) => {
  return {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Cache-Control': `max-age=${cacheTime}`,
  };
};

module.exports = { customHeader, customHeaderFixedCache };
