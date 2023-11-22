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
// app.use(morgan('dev'));
app.use(morgan(':method :url :status :response-time ms - :remote-addr'));

app.use(helmet());

app.use('/', [trades, floor, orderbook, transfers, history, creator]);

module.exports = app;
