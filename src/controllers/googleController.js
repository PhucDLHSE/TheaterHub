const jwt = require('jsonwebtoken');

// Middleware
const ensureAuth = (req, res, next) => {
  if (req.isAuthenticated()) return next();
  res.status(401).json({ success: false, message: 'Bạn cần đăng nhập để truy cập' });
};

const ensureAdmin = (req, res, next) => {
  if (req.isAuthenticated() && req.user.role === 'admin') return next();
  res.status(403).json({ success: false, message: 'Không đủ quyền truy cập' });
};

// Google Callback
const googleCallback = (req, res) => {
  const user = req.user;
  const payload = {
    user_id: user.user_id,
    avatar: user.avatar,
    name: user.name,
    email: user.email,
    role: user.role,
    phone: user.phone || null
  };

  const token = jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: '7d' });

  res.json({
    success: true,
    message: 'Đăng nhập thành công',
    token,
    user: payload
  });
};

// Login thất bại
const loginFailed = (req, res) => {
  res.status(401).json({
    success: false,
    message: 'Đăng nhập thất bại',
    error: req.query.error || 'Lỗi xác thực không xác định',
    errorDescription: req.query.error_description || 'Vui lòng thử lại hoặc liên hệ quản trị viên'
  });
};

// Logout
const logout = (req, res, next) => {
  req.logout((err) => {
    if (err) return next(err);
    res.json({ success: true, message: 'Đăng xuất thành công' });
  });
};

// Trạng thái đăng nhập
const getStatus = (req, res) => {
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
};

// Profile
const getProfile = (req, res) => {
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
};

// Admin Dashboard
const getAdminDashboard = (req, res) => {
  res.json({
    success: true,
    message: 'Chào mừng đến trang quản trị',
    user: {
      id: req.user.user_id,
      name: req.user.name,
      role: req.user.role
    }
  });
};

module.exports = {
  googleCallback,
  loginFailed,
  logout,
  getStatus,
  getProfile,
  getAdminDashboard,
  ensureAuth,
  ensureAdmin
};
