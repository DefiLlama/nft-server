const express = require('express');
const router = express.Router();
const transfers = require('../controllers/transfers');

router.route('/transfers').get(transfers.getTransfers);
router.route('/nfts/:address').get(transfers.getNfts);

module.exports = router;
