const jwt = require('jsonwebtoken');

// Middleware để xác thực JWT
const verifyToken = (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ success: false, message: 'Token không hợp lệ hoặc thiếu' });
  }

  const token = authHeader.split(' ')[1];

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;
    next();
  } catch (err) {
    return res.status(403).json({ success: false, message: 'Token hết hạn hoặc không hợp lệ' });
  }
};

// Middleware để kiểm tra quyền admin
const ensureAdmin = (req, res, next) => {
  if (req.user?.role === 'admin') return next();
  res.status(403).json({ success: false, message: 'Không đủ quyền truy cập' });
};

// Middleware để kiểm tra quyền sở hữu tài nguyên
const ensureOwner = (paramName = 'userId') => {
  return (req, res, next) => {
    const ownerId = parseInt(req.params[paramName]);
    if (req.user?.role === 'admin' || req.user?.user_id === ownerId) return next();

    return res.status(403).json({
      success: false,
      message: 'Không có quyền truy cập tài nguyên này'
    });
  };
};

module.exports = {
  verifyToken,
  ensureAdmin,
  ensureOwner
};
