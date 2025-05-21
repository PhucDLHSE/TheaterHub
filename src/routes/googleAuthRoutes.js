const express = require('express');
const passport = require('passport');
const jwt = require('jsonwebtoken');
const router = express.Router();

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';

// Middleware kiểm tra đăng nhập (session-based fallback)
const ensureAuth = (req, res, next) => {
  if (req.isAuthenticated()) return next();
  res.status(401).json({ success: false, message: 'Bạn cần đăng nhập để truy cập' });
};

const ensureAdmin = (req, res, next) => {
  if (req.isAuthenticated() && req.user.role === 'admin') return next();
  res.status(403).json({ success: false, message: 'Không đủ quyền truy cập' });
};

// Khởi động xác thực Google
router.get('/google', (req, res, next) => {
  console.log('Bắt đầu xác thực Google OAuth');
  passport.authenticate('google', {
    scope: ['profile', 'email'],
    state: Math.random().toString(36).substring(2, 15) 
  })(req, res, next);
});

// Callback từ Google OAuth
router.get('/google/callback',
  passport.authenticate('google', { session: false, failureRedirect: '/auth/failure' }),
  (req, res) => {
    // Sau khi xác thực thành công bằng Google
    const user = req.user;
    const payload = {
      user_id: user.user_id,
      avatar: user.avatar,
      name: user.name,
      email: user.email,
      role: user.role,
      phone: user.phone || null
    };

    const token = jwt.sign(payload, process.env.JWT_SECRET, {
      expiresIn: '7d' 
    });

    // Trả JWT
    res.json({
      success: true,
      message: 'Đăng nhập thành công',
      token,
      user: payload
    });
  }
);

// Đăng nhập thất bại
router.get('/login-failed', (req, res) => {
  res.status(401).json({
    success: false,
    message: 'Đăng nhập thất bại',
    error: req.query.error || 'Lỗi xác thực không xác định',
    errorDescription: req.query.error_description || 'Vui lòng thử lại hoặc liên hệ quản trị viên'
  });
});

// Đăng xuất (nếu dùng session)
router.get('/logout', (req, res, next) => {
  req.logout((err) => {
    if (err) return next(err);
    res.json({ success: true, message: 'Đăng xuất thành công' });
  });
});

// Trạng thái đăng nhập (dành cho session)
router.get('/status', (req, res) => {
  if (req.isAuthenticated()) {
    res.json({
      isAuthenticated: true,
      user: {
        id: req.user.user_id,
        name: req.user.name,
        email: req.user.email,
        role: req.user.role
      }
    });
  } else {
    res.json({ isAuthenticated: false });
  }
});

// Route bảo vệ - session-based
router.get('/profile', ensureAuth, (req, res) => {
  res.json({
    success: true,
    user: {
      id: req.user.user_id,
      name: req.user.name,
      email: req.user.email,
      role: req.user.role,
      google_id: req.user.google_id
    }
  });
});

// Route bảo vệ - admin
router.get('/admin', ensureAuth, ensureAdmin, (req, res) => {
  res.json({
    success: true,
    message: 'Chào mừng đến trang quản trị',
    user: {
      id: req.user.user_id,
      name: req.user.name,
      role: req.user.role
    }
  });
});

module.exports = router;
