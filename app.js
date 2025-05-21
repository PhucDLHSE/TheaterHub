const express = require('express');
const session = require('express-session');
const passport = require('passport');
const cors = require('cors');
const dotenv = require('dotenv');
const configurePassport = require('./src/config/passport');
const pool = require('./src/config/db');
const whitelist = require('./src/config/roleWhitelist'); 

const authRoutes = require('./src/routes/GoogleAuthRoutes');
const userRoutes = require('./src/routes/userRoutes');
const phoneAuthRoutes = require('./src/routes/phoneAuthRoutes');

// Đọc biến môi trường
dotenv.config();

// Khởi tạo app
const app = express();

// Middleware cơ bản
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// CORS cho API
app.use(cors({
  origin: process.env.FRONTEND_URL || '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  credentials: true
}));

// Cấu hình session
app.use(session({
  secret: process.env.SESSION_SECRET || 'theaterhub_secret',
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: process.env.NODE_ENV === 'production',
    maxAge: 24 * 60 * 60 * 1000 // 1 ngày
  }
}));

// Khởi tạo passport
app.use(passport.initialize());
app.use(passport.session());
configurePassport(passport);

// Routes API
app.use('/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/phone-auth', phoneAuthRoutes);  

// Route chính
app.get('/', (req, res) => {
  if (req.isAuthenticated()) {
    res.json({
      message: 'TheaterHub API',
      status: 'running',
      user: {
        id: req.user.user_id,
        name: req.user.name,
        email: req.user.email,
        role: req.user.role || 'customer'
      }
    });
  } else {
    res.json({
      message: 'TheaterHub API',
      status: 'running',
      authEndpoint: '/auth/google'
    });
  }
});

// Middleware bảo vệ các route
const ensureAuth = (req, res, next) => {
  if (req.isAuthenticated()) {
    return next();
  }
  res.status(401).json({ success: false, message: 'Bạn cần đăng nhập để truy cập' });
};

// Route ví dụ được bảo vệ
app.get('/protected', ensureAuth, (req, res) => {
  res.json({
    success: true,
    message: 'Bạn đã truy cập thành công vào route được bảo vệ',
    user: {
      id: req.user.user_id,
      name: req.user.name,
      email: req.user.email
    }
  });
});

// Xử lý lỗi 404
app.use((req, res) => {
  res.status(404).json({ 
    success: false, 
    message: 'Không tìm thấy endpoint' 
  });
});

// Xử lý lỗi chung
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({
    success: false,
    message: 'Lỗi server',
    error: process.env.NODE_ENV === 'production' ? {} : err
  });
});

// Khởi chạy server
const PORT = process.env.PORT || 8080;
app.listen(PORT, () => {
  console.log(`Server đang chạy tại http://localhost:${PORT}`);
});