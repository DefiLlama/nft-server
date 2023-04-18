const express = require('express');
const helmet = require('helmet');

const trades = require('./routes/trades');
const floor = require('./routes/floor');
const orderbook = require('./routes/orderbook');

const app = express();
if (process.env.NODE_ENV === 'development') {
  app.use(require('morgan')('dev'));
}
app.use(helmet());

app.use('/', [trades, floor, orderbook]);

module.exports = app;
