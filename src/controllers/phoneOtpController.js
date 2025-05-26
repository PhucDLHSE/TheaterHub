const pool = require('../config/db');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { sendOtpSms, formatPhoneNumber } = require('../services/otpService');

const requestOtp = async (req, res) => {
  const { phone } = req.body;
  if (!phone) {
    return res.status(400).json({ success: false, message: 'Thiếu số điện thoại' });
  }

  const formattedPhone = formatPhoneNumber(phone);
  const otp = Math.floor(100000 + Math.random() * 900000).toString();
  const expiredAt = new Date(Date.now() + 5 * 60 * 1000); // 5 phút

  try {
    await pool.query(
      'INSERT INTO otp_logs (phone, otp_code, expired_at, is_used) VALUES (?, ?, ?, FALSE)',
      [formattedPhone, otp, expiredAt]
    );

    await sendOtpSms(formattedPhone, otp);

    res.json({ success: true, message: 'Đã gửi OTP tới số điện thoại' });
  } catch (err) {
    console.error('Lỗi gửi OTP:', err);
    res.status(500).json({ success: false, message: 'Lỗi server khi gửi OTP' });
  }
};

const verifyOtp = async (req, res) => {
  const { phone, otp } = req.body;
  if (!phone || !otp) {
    return res.status(400).json({ success: false, message: 'Thiếu số điện thoại hoặc OTP' });
  }

  const formattedPhone = formatPhoneNumber(phone);

  try {
    const [records] = await pool.query(
      'SELECT * FROM otp_logs WHERE phone = ? AND otp_code = ? AND is_used = FALSE AND expired_at > NOW() ORDER BY expired_at DESC LIMIT 1',
      [formattedPhone, otp]
    );

    if (records.length === 0) {
      return res.status(400).json({ success: false, message: 'OTP không hợp lệ hoặc đã hết hạn' });
    }

    await pool.query('UPDATE otp_logs SET is_used = TRUE WHERE otp_id = ?', [records[0].otp_id]);

    res.json({ success: true, message: 'Xác thực OTP thành công' });
  } catch (err) {
    console.error('Lỗi xác thực OTP:', err);
    res.status(500).json({ success: false, message: 'Lỗi server khi xác thực OTP' });
  }
};

const registerWithPhone = async (req, res) => {
  const { name, phone, password } = req.body;

  if (!name || !phone || !password) {
    return res.status(400).json({ success: false, message: 'Vui lòng nhập đầy đủ thông tin' });
  }

  const formattedPhone = formatPhoneNumber(phone);

  try {
    const [otpUsed] = await pool.query(
      'SELECT * FROM otp_logs WHERE phone = ? AND is_used = TRUE ORDER BY expired_at DESC LIMIT 1',
      [formattedPhone]
    );

    if (otpUsed.length === 0) {
      return res.status(400).json({ success: false, message: 'Bạn chưa xác thực OTP cho số này' });
    }

    const [exists] = await pool.query('SELECT * FROM users WHERE phone = ?', [formattedPhone]);
    if (exists.length > 0) {
      return res.status(409).json({ success: false, message: 'Số điện thoại đã được đăng ký' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const [result] = await pool.query(
      'INSERT INTO users (name, phone, password, role) VALUES (?, ?, ?, ?)',
      [name, formattedPhone, hashedPassword, 'customer']
    );

    const newUser = {
      user_id: result.insertId,
      name,
      phone: formattedPhone,
      role: 'customer'
    };

    const token = jwt.sign(newUser, process.env.JWT_SECRET, { expiresIn: '7d' });

    res.status(201).json({
      success: true,
      message: 'Đăng ký thành công',
      token,
      user: newUser
    });
  } catch (error) {
    console.error('Lỗi đăng ký:', error);
    res.status(500).json({ success: false, message: 'Lỗi server khi đăng ký' });
  }
};

module.exports = { requestOtp, verifyOtp, registerWithPhone };
