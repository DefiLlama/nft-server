const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const morgan = require('morgan');

const trades = require('./routes/trades');
const floor = require('./routes/floor');

console.log(floor);

const app = express();
// if (process.env.NODE_ENV === 'development') {
//   app.use(morgan('dev'));
// }
app.use(morgan('dev'));
app.use(helmet());
app.use(cors());

app.use('/api/v1', trades);
app.use('/api/v1', floor);

module.exports = app;
