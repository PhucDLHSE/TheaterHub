const jwt = require('jsonwebtoken');

// Callback từ Google OAuth sau khi xác thực thành công
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

  const token = jwt.sign(payload, process.env.JWT_SECRET, {
    expiresIn: '7d'
  });

  res.json({
    success: true,
    message: 'Đăng nhập thành công',
    token,
    user: payload
  });
};

// Đăng nhập thất bại
const loginFailed = (req, res) => {
  res.status(401).json({
    success: false,
    message: 'Đăng nhập thất bại',
    error: req.query.error || 'Lỗi xác thực không xác định',
    errorDescription: req.query.error_description || 'Vui lòng thử lại hoặc liên hệ quản trị viên'
  });
};

// Trạng thái đăng nhập từ token (JWT-based)
const getStatus = (req, res) => {
  if (req.user) {
    return res.json({
      isAuthenticated: true,
      user: {
        id: req.user.user_id,
        name: req.user.name,
        email: req.user.email,
        role: req.user.role
      }
    });
  }
  res.status(401).json({ isAuthenticated: false });
};

// Đăng xuất (JWT → client chỉ cần xoá token)
const logout = (req, res) => {
  res.json({ success: true, message: 'Đăng xuất thành công (xóa token phía client)' });
};

// Route lấy thông tin cá nhân
const getProfile = (req, res) => {
  res.json({
    success: true,
    user: {
      id: req.user.user_id,
      name: req.user.name,
      email: req.user.email,
      role: req.user.role,
      google_id: req.user.google_id,
      avatar: req.user.avatar
    }
  });
};

// Trang quản trị (chỉ dành cho admin)
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
  getAdminDashboard
};
