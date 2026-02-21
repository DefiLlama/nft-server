const express = require('express');
const router = express.Router();
const transfers = require('../controllers/transfers');
const asyncHandler = require('../middleware/asyncHandler');

router.route('/transfers').get(asyncHandler(transfers.getTransfers));
router.route('/nfts/:address').get(asyncHandler(transfers.getNfts));
router.route('/tokenStandard/:nfts').get(asyncHandler(transfers.getTokenStandard));
router.route('/erc1155owners/:nft').get(asyncHandler(transfers.getERC1155Owners));

module.exports = router;
