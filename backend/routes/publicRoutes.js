const express = require('express');
const router = express.Router();
const asyncHandler = require('../utils/asyncHandler');
const {
  getTournamentInfo, registerPlayer, verifyPlayerPayment, registerTeam, verifyTeamPayment,
  getLiveAuctionSpectatorView,
} = require('../controllers/publicController');

router.get('/:slug/info', asyncHandler(getTournamentInfo));
router.post('/:slug/player/register', asyncHandler(registerPlayer));
router.post('/:slug/player/verify-payment', asyncHandler(verifyPlayerPayment));
router.post('/:slug/team/register', asyncHandler(registerTeam));
router.post('/:slug/team/verify-payment', asyncHandler(verifyTeamPayment));
router.get('/:slug/live-auction', asyncHandler(getLiveAuctionSpectatorView));

module.exports = router;