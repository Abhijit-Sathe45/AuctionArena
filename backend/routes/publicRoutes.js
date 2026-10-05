const express = require('express');
const router = express.Router();
const asyncHandler = require('../utils/asyncHandler');
const {
  getTournamentInfo, registerPlayer, verifyPlayerPayment, registerTeam, verifyTeamPayment,
  getLiveAuctionSpectatorView, getTeamsListForRemote, teamLogin, getTeamRemoteState,
  teamBid, teamPass,
} = require('../controllers/publicController');
const analyticsCtrl = require('../controllers/analyticsController');

router.get('/:slug/info', asyncHandler(getTournamentInfo));
router.get('/:slug/analytics', asyncHandler(analyticsCtrl.getPublicAnalytics));
router.post('/:slug/player/register', asyncHandler(registerPlayer));
router.post('/:slug/player/verify-payment', asyncHandler(verifyPlayerPayment));
router.post('/:slug/team/register', asyncHandler(registerTeam));
router.post('/:slug/team/verify-payment', asyncHandler(verifyTeamPayment));
router.get('/:slug/live-auction', asyncHandler(getLiveAuctionSpectatorView));

// Team Owner Remote Bidding (/bid/:slug)
router.get('/:slug/teams-list', asyncHandler(getTeamsListForRemote));
router.post('/:slug/team-login', asyncHandler(teamLogin));
router.get('/:slug/team-remote-state', asyncHandler(getTeamRemoteState));
router.post('/:slug/team-bid', asyncHandler(teamBid));
router.post('/:slug/team-pass', asyncHandler(teamPass));

module.exports = router;