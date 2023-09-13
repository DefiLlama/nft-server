const express = require('express');
const router = express.Router();
const transfers = require('../controllers/transfers');

router.route('/transfers').get(transfers.getTransfers);
router.route('/nfts/:address').get(transfers.getNfts);
router.route('/tokenStandard/:nfts').get(transfers.getTokenStandard);
router.route('/erc1155owners/:nft').get(transfers.getERC1155Owners);

module.exports = router;
