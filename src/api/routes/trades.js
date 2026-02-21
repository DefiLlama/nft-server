const express = require('express');
const router = express.Router();
const trades = require('../controllers/trades');
const asyncHandler = require('../middleware/asyncHandler');

// trades (on indexa db)
router.route('/volume').get(asyncHandler(trades.getVolume));
router.route('/exchangeStats').get(asyncHandler(trades.getExchangeStats));
router.route('/exchangeVolume').get(asyncHandler(trades.getExchangeVolume));
router.route('/sales').get(asyncHandler(trades.getSales));
router.route('/stats/:collectionId').get(asyncHandler(trades.getStats));
router.route('/royalties').get(asyncHandler(trades.getRoyalties));
router.route('/royalty/:collectionId').get(asyncHandler(trades.getRoyalty));
router.route('/royaltyHistory/:collectionId').get(asyncHandler(trades.getRoyaltyHistory));
router.route('/lastSalePrice/:nft').get(asyncHandler(trades.getLastSalePrice));
router.route('/userSales/:user').get(asyncHandler(trades.getUserSales));

module.exports = router;
