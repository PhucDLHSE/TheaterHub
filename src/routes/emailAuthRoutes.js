const express = require('express');
const router = express.Router();
const {
  registerWithEmail,
  verifyEmail,
  resendVerification,
  loginWithEmail
} = require('../controllers/emailAuthController');

router.post('/register', registerWithEmail);
router.get('/verify', verifyEmail);
router.post('/resend', resendVerification);
router.post('/login', loginWithEmail)

module.exports = router;
