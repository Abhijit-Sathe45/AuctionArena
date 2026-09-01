const express = require('express');
const router = express.Router();
const { protect, requireRole, requireActivePass } = require('../middleware/auth');
const asyncHandler = require('../utils/asyncHandler');
const ctrl = require('../controllers/organizerAdminController');
const demoCtrl = require('../controllers/demoController');
const analyticsCtrl = require('../controllers/analyticsController');

router.use(protect, requireRole('ORGANIZER'), requireActivePass);

router.get('/dashboard', asyncHandler(ctrl.getDashboardOverview));
router.get('/analytics', asyncHandler(analyticsCtrl.getOrganizerAnalytics));

router.get('/settings', asyncHandler(ctrl.getSettings));
router.put('/settings', asyncHandler(ctrl.updateSettings));

router.get('/categories', asyncHandler(ctrl.listCategories));
router.post('/categories', asyncHandler(ctrl.createCategory));
router.put('/categories/:id', asyncHandler(ctrl.updateCategory));
router.delete('/categories/:id', asyncHandler(ctrl.deleteCategory));

router.get('/extra-point-sets', asyncHandler(ctrl.listExtraPointSets));
router.post('/extra-point-sets', asyncHandler(ctrl.createExtraPointSet));
router.post('/extra-point-sets/grant', asyncHandler(ctrl.grantExtraPointsToTeam));

router.get('/players', asyncHandler(ctrl.listPlayers));
router.put('/players/:id', asyncHandler(ctrl.updatePlayer));
router.delete('/players/:id', asyncHandler(ctrl.deletePlayer));

router.get('/teams', asyncHandler(ctrl.listTeams));
router.post('/teams', asyncHandler(ctrl.createTeamByAdmin));
router.put('/teams/:id', asyncHandler(ctrl.updateTeam));
router.delete('/teams/:id', asyncHandler(ctrl.deleteTeam));

// Demo / Practice Auction Simulator routes
router.post('/demo/seed', asyncHandler(demoCtrl.seedDemoData));
router.post('/demo/clear', asyncHandler(demoCtrl.clearDemoData));

module.exports = router;