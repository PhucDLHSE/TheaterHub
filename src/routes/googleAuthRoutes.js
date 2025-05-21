const express = require('express');
const passport = require('passport');
const router = express.Router();

const {
  googleCallback,
  loginFailed,
  logout,
  getStatus,
  getProfile,
  getAdminDashboard,
  ensureAuth,
  ensureAdmin
} = require('../controllers/googleController');

// Google OAuth
router.get('/google', (req, res, next) => {
  passport.authenticate('google', {
    scope: ['profile', 'email'],
    state: Math.random().toString(36).substring(2, 15)
  })(req, res, next);
});

// Callback URL
router.get('/google/callback',
  passport.authenticate('google', { session: false, failureRedirect: '/auth/failure' }),
  googleCallback
);

// Login thất bại
router.get('/login-failed', loginFailed);

// Logout
router.get('/logout', logout);

// Trạng thái đăng nhập
router.get('/status', getStatus);
router.get('/profile', ensureAuth, getProfile);
router.get('/admin', ensureAuth, ensureAdmin, getAdminDashboard);

module.exports = router;
