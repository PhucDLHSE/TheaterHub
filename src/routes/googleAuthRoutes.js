const express = require('express');
const passport = require('passport');
const router = express.Router();

const { verifyToken, ensureAdmin } = require('../middlewares/jwtAuth');

const {
  googleCallback,
  loginFailed,
  logout,
  getStatus,
  getProfile,
  getAdminDashboard
} = require('../controllers/googleController');

// Google OAuth: Bắt đầu xác thực
router.get('/google', (req, res, next) => {
  passport.authenticate('google', {
    scope: ['profile', 'email'],
    session: false,
    state: Math.random().toString(36).substring(2, 15)
  })(req, res, next);
});

// Google OAuth: Callback sau khi xác thực
router.get(
  '/google/callback',
  (req, res, next) => {
    passport.authenticate('google', { session: false }, (err, user, info) => {
      if (err) {
        console.error('❌ Passport Google Error:', err);
        return res.status(500).json({
          success: false,
          error_code: 'SERVER_ERROR',
          message: 'Lỗi server trong quá trình xác thực Google'
        });
      }

      if (!user) {
        console.warn('⚠ Passport Google Info:', info?.message);
        return res.status(401).json({
          success: false,
          error_code: 'GOOGLE_AUTH_FAILED',
          message: info?.message || 'Đăng nhập Google thất bại'
        });
      }

      req.user = user;
      next();
    })(req, res, next);
  },
  googleCallback
);

// Đăng nhập thất bại
router.get('/login-failed', loginFailed);

// Đăng xuất
router.get('/logout', logout);

// Kiểm tra trạng thái đăng nhập (dựa trên JWT)
router.get('/status', verifyToken, getStatus);

// Trang cá nhân (yêu cầu JWT)
router.get('/profile', verifyToken, getProfile);

// Trang admin (yêu cầu JWT và vai trò admin)
router.get('/admin', verifyToken, ensureAdmin, getAdminDashboard);

module.exports = router;
