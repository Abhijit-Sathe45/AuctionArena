const express = require('express');
const router = express.Router();
const { protect, requireRole, requireActivePass } = require('../middleware/auth');
const asyncHandler = require('../utils/asyncHandler');
const ctrl = require('../controllers/pdfController');

router.use(protect, requireRole('ORGANIZER'), requireActivePass);

router.get('/team/:teamId', asyncHandler(ctrl.downloadTeamPDF));
router.get('/all-teams', asyncHandler(ctrl.downloadAllTeamsInfo));
router.get('/history', asyncHandler(ctrl.downloadHistoryPDF));

module.exports = router;