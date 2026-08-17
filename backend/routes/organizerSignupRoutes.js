const express = require('express');
const router = express.Router();
const asyncHandler = require('../utils/asyncHandler');
const { initiateSignup, verifyPayment, renewPass, verifyRenewPayment } = require('../controllers/organizerSignupController');
const { protect, requireRole } = require('../middleware/auth');

router.post('/initiate', asyncHandler(initiateSignup));
router.post('/verify-payment', asyncHandler(verifyPayment));

// Renewal (organizer must be logged in, even if pass expired, to renew)
router.post('/renew', protect, requireRole('ORGANIZER'), asyncHandler(renewPass));
router.post('/verify-renew-payment', protect, requireRole('ORGANIZER'), asyncHandler(verifyRenewPayment));

module.exports = router;