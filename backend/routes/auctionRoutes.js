const express = require('express');
const router = express.Router();
const { protect, requireRole, requireActivePass } = require('../middleware/auth');
const asyncHandler = require('../utils/asyncHandler');
const ctrl = require('../controllers/auctionController');

router.use(protect, requireRole('ORGANIZER'), requireActivePass);

router.get('/state', asyncHandler(ctrl.getState));
router.get('/category-players/:categoryId', asyncHandler(ctrl.getCategoryPlayers));
router.post('/select-category', asyncHandler(ctrl.selectCategory));
router.post('/shuffle-queue', asyncHandler(ctrl.shuffleQueue));
router.post('/next-player', asyncHandler(ctrl.nextPlayer));
router.post('/bid', asyncHandler(ctrl.placeBid));
router.post('/undo-bid', asyncHandler(ctrl.undoBid));
router.post('/sold', asyncHandler(ctrl.markSold));
router.post('/unsold', asyncHandler(ctrl.markUnsold));
router.post('/re-auction-unsold', asyncHandler(ctrl.reAuctionUnsold));
router.get('/history', asyncHandler(ctrl.getHistory));

module.exports = router;