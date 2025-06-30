const express = require('express');
const passport = require('passport');
const cors = require('cors');
const dotenv = require('dotenv');
const configurePassport = require('./src/config/passport');
const pool = require('./src/config/db');
const whitelist = require('./src/config/roleWhitelist'); 
const { confirmWebhook } = require('./src/utils/payos');

const authRoutes = require('./src/routes/googleAuthRoutes');
const userRoutes = require('./src/routes/userRoutes');
// const phoneAuthRoutes = require('./src/routes/phoneAuthRoutes');
const phoneOtpRoutes = require('./src/routes/phoneOtpRoutes');
const emailAuthRoutes = require('./src/routes/emailAuthRoutes');
const organizerRoutes = require('./src/routes/organizerRoutes'); 
const eventCategoryRoutes = require('./src/routes/eventCategoryRoutes');
const eventRoutes = require('./src/routes/eventRoutes');
const locationRoutes = require('./src/routes/locationRoutes');
const showtimeRoutes = require('./src/routes/showtimeRoutes');
const ticketTypeRoutes = require('./src/routes/ticketTypeRoutes');
const seatRoutes = require('./src/routes/seatRoutes');
const publicEventRoutes = require('./src/routes/publicEventRoutes');
const bookingRoutes = require('./src/routes/bookingRoutes');
const paymentRoutes = require('./src/routes/paymentRoutes');
const ticketRoutes = require('./src/routes/ticketRoutes');


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
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
  credentials: true
}));

// Khởi tạo passport
app.use(passport.initialize());
configurePassport(passport);

// Routes API
app.use('/auth', authRoutes);
app.use('/api/users', userRoutes);
// app.use('/api/phone-auth', phoneAuthRoutes);  
app.use('/api/phone-otp', phoneOtpRoutes);
app.use('/api/email-auth', emailAuthRoutes);
app.use('/api/organizers', organizerRoutes);
app.use('/api/event-categories', eventCategoryRoutes);
app.use('/api/events', eventRoutes);
app.use('/api/location', locationRoutes); 
app.use('/api', showtimeRoutes);
app.use('/api', ticketTypeRoutes);
app.use('/api', seatRoutes);
app.use('/api/public', publicEventRoutes);
app.use('/api/bookings', bookingRoutes);
app.use('/api/payments', paymentRoutes);
app.use('/api/tickets', ticketRoutes);



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
  confirmWebhook();
});