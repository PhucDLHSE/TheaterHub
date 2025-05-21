/**
 * Middleware xác thực và phân quyền
 */
// Middleware xác thực người dùng
const ensureAuth = (req, res, next) => {
  if (req.isAuthenticated()) {
    return next();
  }
  res.status(401).json({
    success: false,
    message: 'Bạn cần đăng nhập để truy cập tài nguyên này'
  });
};

// Middleware kiểm tra quyền admin
const ensureAdmin = (req, res, next) => {
  if (req.isAuthenticated() && req.user.role === 'admin') {
    return next();
  }
  res.status(403).json({
    success: false,
    message: 'Không đủ quyền truy cập'
  });
};

// Middleware kiểm tra quyền truy cập của người dùng
const ensureOwner = (paramName = 'userId') => {
  return (req, res, next) => {
    const resourceOwnerId = parseInt(req.params[paramName]);
    
    if (!resourceOwnerId) {
      return res.status(400).json({
        success: false,
        message: 'ID không hợp lệ'
      });
    }
    
    // Cho phép admin truy cập mọi resource
    if (req.user.role === 'admin') {
      return next();
    }
    
    // Người dùng chỉ có thể truy cập resource của chính họ
    if (req.isAuthenticated() && req.user.user_id === resourceOwnerId) {
      return next();
    }
    
    res.status(403).json({
      success: false,
      message: 'Không có quyền truy cập tài nguyên này'
    });
  };
};

module.exports = {
  ensureAuth,
  ensureAdmin,
  ensureOwner
};