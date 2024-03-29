const express = require('express');
const router = express.Router();
const history = require('../controllers/history');

router.route('/history').get(history.getHistory);
router.route('/available').get(history.getAvailable);
router.route('/availableSmol').get(history.getAvailableSmol);

module.exports = router;
