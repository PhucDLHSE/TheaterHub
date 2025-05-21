const express = require('express');
const router = express.Router();
const { registerWithPhone, loginWithPhone } = require('../controllers/phoneAuthController');

router.post('/register/phone', registerWithPhone);
router.post('/login/phone', loginWithPhone);

module.exports = router;
