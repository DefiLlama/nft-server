const express = require('express');
const router = express.Router();
const creator = require('../controllers/creator');
const asyncHandler = require('../middleware/asyncHandler');

router.route('/createdNfts/:creator').get(asyncHandler(creator.getCreatedNfts));
router.route('/creator/:nfts').get(asyncHandler(creator.getCreators));
router
  .route('/ownershipTransferred/:creator')
  .get(asyncHandler(creator.getOwnershipTransferred));

module.exports = router;
