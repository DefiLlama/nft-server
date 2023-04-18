const express = require('express');
const router = express.Router();
const orderbook = require('../controllers/orderbook');

// orderbook (on nft db)
router.route('/orderbook/:collectionId').get(orderbook.getOrders);

module.exports = router;
