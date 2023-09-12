const express = require('express');
const router = express.Router();
const trades = require('../controllers/trades');

// trades (on indexa db)
router.route('/volume').get(trades.getVolume);
router.route('/exchangeStats').get(trades.getExchangeStats);
router.route('/exchangeVolume').get(trades.getExchangeVolume);
router.route('/sales').get(trades.getSales);
router.route('/stats/:collectionId').get(trades.getStats);
router.route('/royalties').get(trades.getRoyalties);
router.route('/royalty/:collectionId').get(trades.getRoyalty);
router.route('/royaltyHistory/:collectionId').get(trades.getRoyaltyHistory);
router.route('/lastSalePrice/:nft').get(trades.getLastSalePrice);

module.exports = router;
