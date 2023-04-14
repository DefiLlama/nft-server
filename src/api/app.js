const express = require('express');
const helmet = require('helmet');
const cors = require('cors');

const trades = require('./routes/trades');
const floor = require('./routes/floor');

const app = express();
app.use(helmet());
app.use(cors());

app.use('/api/v1', trades);
app.use('/api/v1', floor);

module.exports = app;
