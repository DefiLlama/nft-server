const express = require('express');
const router = express.Router();
const orderbook = require('../controllers/orderbook');
const asyncHandler = require('../middleware/asyncHandler');

// orderbook (on nft db)
router.route('/orderbook/:collectionId').get(asyncHandler(orderbook.getOrders));

module.exports = router;
