const express = require('express');
const helmet = require('helmet');
const morgan = require('morgan');

const trades = require('./routes/trades');
const floor = require('./routes/floor');
const orderbook = require('./routes/orderbook');
const transfers = require('./routes/transfers');
const history = require('./routes/history');
const creator = require('./routes/creator');

const app = express();
app.use(morgan('dev'));

app.use(helmet());

app.use('/', [trades, floor, orderbook, transfers, history, creator]);

app.use((err, req, res, next) => {
  if (res.headersSent) return next(err);

  const status = Number(err?.statusCode ?? err?.status);
  const statusCode = status >= 400 && status < 600 ? status : 500;

  if (statusCode >= 500) {
    console.error(err);
  }

  return res.status(statusCode).json({
    error:
      statusCode === 500 ? 'Internal server error' : err.message || 'Error',
  });
});

module.exports = app;
