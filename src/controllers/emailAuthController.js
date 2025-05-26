const pool = require('../config/db');
const bcrypt = require('bcrypt');
const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const { sendVerificationEmail } = require('../services/emailService');
const formatUserPayload = require('../utils/formatUserPayload');

const registerWithEmail = async (req, res) => {
    const { name, email, password } = req.body;

    if (!name || !email || !password)
        return res.status(400).json({ success: false, message: 'Vui lòng nhập đầy đủ thông tin' });

    try {
        const [exists] = await pool.query('SELECT * FROM users WHERE email = ?', [email]);
        if (exists.length > 0) {
            const user = exists[0];
            if (user.provider === 'google') {
                return res.status(409).json({ success: false, message: 'Email này đã được đăng ký bằng Google. Vui lòng đăng nhập bằng Google.' });
            }
            return res.status(409).json({ success: false, message: 'Email đã được đăng ký' });
        }

        // Hash password
        const hashedPassword = await bcrypt.hash(password, 10);

        // Tạo user
        const [result] = await pool.query(
            'INSERT INTO users (name, email, password, role, email_verified) VALUES (?, ?, ?, ?, ?)',
            [name, email, hashedPassword, 'customer', false]
        );
        const userId = result.insertId;

        // Tạo mã xác thực
        const verificationCode = Math.floor(100000 + Math.random() * 900000).toString();
        const expiredAt = new Date(Date.now() + 24 * 60 * 60 * 1000); 

        await pool.query(
            'INSERT INTO email_verifications (user_id, verification_code, expired_at) VALUES (?, ?, ?)',
            [userId, verificationCode, expiredAt]
        );

        // Gửi email
        const sent = await sendVerificationEmail(email, verificationCode);
        if (!sent) throw new Error('Gửi email thất bại');
        console.log(`✅ Email xác thực đã gửi tới: ${email}`);

        res.status(201).json({
            success: true,
            message: 'Đăng ký thành công, vui lòng kiểm tra email để xác thực'
        });
    } catch (error) {
        console.error('❌ Lỗi đăng ký:', error);
        res.status(500).json({ success: false, message: 'Đã xảy ra lỗi server khi đăng ký' });
    }
};

const verifyEmail = async (req, res) => {
    const { code } = req.query;

    if (!code)
        return res.status(400).json({ success: false, message: 'Thiếu mã xác thực' });

    try {
        const [records] = await pool.query(
            `SELECT ev.user_id, u.email_verified FROM email_verifications ev
             JOIN users u ON ev.user_id = u.user_id
             WHERE ev.verification_code = ? AND ev.is_used = FALSE AND ev.expired_at > NOW()`,
            [code]
        );

        if (records.length === 0)
            return res.status(400).json({ success: false, message: 'Mã xác thực không hợp lệ hoặc đã hết hạn' });

        const { user_id, email_verified } = records[0];

        if (email_verified)
            return res.status(400).json({ success: false, message: 'Email đã được xác thực' });

        await pool.query('UPDATE users SET email_verified = TRUE WHERE user_id = ?', [user_id]);
        await pool.query('UPDATE email_verifications SET is_used = TRUE WHERE user_id = ?', [user_id]);

        res.json({
            success: true,
            message: 'Xác thực email thành công, bạn có thể đăng nhập'
        });
    } catch (error) {
        console.error('❌ Lỗi xác thực email:', error);
        res.status(500).json({ success: false, message: 'Đã xảy ra lỗi server khi xác thực email' });
    }
};

const resendVerification = async (req, res) => {
    const { email } = req.body;

    if (!email)
        return res.status(400).json({ success: false, message: 'Thiếu email' });

    try {
        const [users] = await pool.query('SELECT * FROM users WHERE email = ?', [email]);

        if (users.length === 0)
            return res.status(404).json({ success: false, message: 'Không tìm thấy người dùng' });

        const user = users[0];

        if (user.email_verified)
            return res.status(400).json({ success: false, message: 'Email đã được xác thực' });

        const verificationCode = Math.floor(100000 + Math.random() * 900000).toString();
        const expiredAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24h

        await pool.query(
            'INSERT INTO email_verifications (user_id, verification_code, expired_at) VALUES (?, ?, ?)',
            [user.user_id, verificationCode, expiredAt]
        );

        const sent = await sendVerificationEmail(email, verificationCode);
        if (!sent) throw new Error('Gửi email thất bại');

        res.json({
            success: true,
            message: 'Đã gửi lại email xác thực, vui lòng kiểm tra hộp thư'
        });
    } catch (error) {
        console.error('❌ Lỗi gửi lại email:', error);
        res.status(500).json({ success: false, message: 'Đã xảy ra lỗi server khi gửi lại email' });
    }
};

const loginWithEmail = async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password)
    return res.status(400).json({ success: false, message: 'Thiếu email hoặc mật khẩu' });

  try {
    const [users] = await pool.query('SELECT * FROM users WHERE email = ?', [email]);
    if (users.length === 0)
      return res.status(401).json({ success: false, message: 'Email chưa được đăng ký' });

    const user = users[0];

    // Kiểm tra email đã xác thực chưa
    if (!user.email_verified) {
      return res.status(403).json({ success: false, message: 'Email chưa được xác thực, vui lòng kiểm tra hộp thư' });
    }

    // Kiểm tra mật khẩu
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch)
      return res.status(401).json({ success: false, message: 'Sai mật khẩu' });

    const payload = formatUserPayload(user);
    const token = jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: '7d' });

    res.json({
      success: true,
      message: 'Đăng nhập thành công',
      token,
      user: payload
    });
  } catch (error) {
    console.error('❌ Lỗi đăng nhập email:', error);
    res.status(500).json({ success: false, message: 'Lỗi server khi đăng nhập' });
  }
};

module.exports = { registerWithEmail, verifyEmail, resendVerification, loginWithEmail };
