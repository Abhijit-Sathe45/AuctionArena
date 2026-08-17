const express = require('express');
const router = express.Router();
const asyncHandler = require('../utils/asyncHandler');
const { superAdminLogin, organizerLogin } = require('../controllers/authController');

router.post('/superadmin/login', asyncHandler(superAdminLogin));
router.post('/organizer/login', asyncHandler(organizerLogin));

module.exports = router;