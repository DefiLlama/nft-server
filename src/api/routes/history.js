const express = require('express');
const router = express.Router();
const history = require('../controllers/history');

router.route('/history').get(history.getHistory);

module.exports = router;
