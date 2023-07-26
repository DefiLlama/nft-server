const express = require('express');
const router = express.Router();
const transfers = require('../controllers/transfers');

router.route('/transfers').get(transfers.getTransfers);

module.exports = router;
