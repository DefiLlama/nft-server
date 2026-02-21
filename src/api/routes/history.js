const express = require('express');
const router = express.Router();
const history = require('../controllers/history');
const asyncHandler = require('../middleware/asyncHandler');

router.route('/history').get(asyncHandler(history.getHistory));
router.route('/available').get(asyncHandler(history.getAvailable));
router.route('/availableSmol').get(asyncHandler(history.getAvailableSmol));

module.exports = router;
