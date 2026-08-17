const express = require('express');
const router = express.Router();
const { protect, requireRole } = require('../middleware/auth');
const asyncHandler = require('../utils/asyncHandler');
const ctrl = require('../controllers/superAdminController');

router.use(protect, requireRole('SUPER_ADMIN'));

router.get('/pricing-plans', asyncHandler(ctrl.listPricingPlans));
router.post('/pricing-plans', asyncHandler(ctrl.upsertPricingPlan));

router.get('/organizers', asyncHandler(ctrl.listOrganizers));
router.get('/organizers/:id', asyncHandler(ctrl.getOrganizer));
router.post('/organizers/:id/suspend', asyncHandler(ctrl.suspendOrganizer));
router.post('/organizers/:id/reactivate', asyncHandler(ctrl.reactivateOrganizer));
router.post('/organizers/:id/extend', asyncHandler(ctrl.extendPass));
router.delete('/organizers/:id', asyncHandler(ctrl.deleteOrganizer));

module.exports = router;