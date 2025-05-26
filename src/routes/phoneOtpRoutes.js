const express = require('express');
const router = express.Router();
const { requestOtp, verifyOtp, registerWithPhone } = require('../controllers/phoneOtpController');

router.post('/request-otp', requestOtp);
router.post('/verify-otp', verifyOtp);
router.post('/register', registerWithPhone);

module.exports = router;
