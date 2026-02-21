const express = require('express');
const router = express.Router();
const floor = require('../controllers/floor');
const asyncHandler = require('../middleware/asyncHandler');

// floor (on nft db)
router.route('/collections').get(asyncHandler(floor.getCollections));
router.route('/collection/:collectionId').get(asyncHandler(floor.getCollection));
router.route('/floorHistory/:collectionId').get(asyncHandler(floor.getFloorHistory));

module.exports = router;
