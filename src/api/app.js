const express = require('express');
const helmet = require('helmet');

const trades = require('./routes/trades');
const floor = require('./routes/floor');
const orderbook = require('./routes/orderbook');
const transfers = require('./routes/transfers');

const app = express();
if (process.env.NODE_ENV === 'development') {
  app.use(require('morgan')('dev'));
}
app.use(helmet());

app.use('/', [trades, floor, orderbook, transfers]);

module.exports = app;
