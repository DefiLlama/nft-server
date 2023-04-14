const express = require('express');
const router = express.Router();
const floor = require('../controllers/floor');

// floor (on nft db)
router.route('/collections').get(floor.getCollections);
router.route('/collection/:collectionId').get(floor.getCollection);
router.route('/floorHistory/:collectionId').get(floor.getFloorHistory);

module.exports = router;
