const express = require('express');
const router = express.Router();
const creator = require('../controllers/creator');

router.route('/createdNfts/:creator').get(creator.getCreatedNfts);
router.route('/creator/:nfts').get(creator.getCreators);

module.exports = router;
