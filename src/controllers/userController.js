const pool = require('../config/db');
const bcrypt = require('bcrypt');
const crypto = require('crypto');
const { sendVerificationEmail, sendResetPasswordEmail } = require('../services/emailService');

// Lấy danh sách tất cả user (admin)
const getAllUsers = async (req, res) => {
  try {
    const [users] = await pool.query('SELECT user_id, name, email, phone, role, avatar, is_locked FROM users');
    res.json({ success: true, users });
  } catch (error) {
    console.error('❌ Lỗi getAllUsers:', error);
    res.status(500).json({ success: false, message: 'Lỗi server khi lấy danh sách người dùng' });
  }
};

// Tìm kiếm user (by name hoặc email, admin)
const searchUsers = async (req, res) => {
  const { query } = req.query;
  try {
    const [users] = await pool.query(
      'SELECT user_id, name, email, phone, role, avatar, is_locked FROM users WHERE name LIKE ? OR email LIKE ?',
      [`%${query}%`, `%${query}%`]
    );
    res.json({ success: true, users });
  } catch (error) {
    console.error('❌ Lỗi searchUsers:', error);
    res.status(500).json({ success: false, message: 'Lỗi server khi tìm kiếm người dùng' });
  }
};

// Lấy thông tin người dùng hiện tại
const getCurrentUser = async (req, res) => {
  try {
    const userId = req.user.user_id;

    console.log('🔍 Đang truy vấn user_id =', userId);

    const [rows] = await pool.query(
      'SELECT user_id, name, email, phone, role, avatar, is_locked FROM users WHERE user_id = ?',
      [userId]
    );

    console.log('✅ Query hoàn tất:', rows);

    if (rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy người dùng' });
    }

    res.json({ success: true, user: rows[0] });
  } catch (err) {
    console.error('❌ Lỗi lấy thông tin người dùng:', err);
    res.status(500).json({ success: false, message: 'Lỗi server' });
  }
};

// Lấy thông tin user
const getUserById = async (req, res) => {
  const { id } = req.params;
  try {
    const [users] = await pool.query('SELECT user_id, name, email, phone, role, avatar, is_locked FROM users WHERE user_id = ?', [id]);
    if (users.length === 0) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy người dùng' });
    }
    res.json({ success: true, user: users[0] });
  } catch (error) {
    console.error('❌ Lỗi getUserById:', error);
    res.status(500).json({ success: false, message: 'Lỗi server' });
  }
};

// Cập nhật thông tin user
const updateUser = async (req, res) => {
  const { id } = req.params;
  const { name, phone, avatar } = req.body;
  try {
    await pool.query('UPDATE users SET name = ?, phone = ?, avatar = ? WHERE user_id = ?', [name, phone, avatar, id]);
    res.json({ success: true, message: 'Cập nhật thông tin thành công' });
  } catch (error) {
    console.error('❌ Lỗi updateUser:', error);
    res.status(500).json({ success: false, message: 'Lỗi server' });
  }
};

// Cập nhật thông tin cá nhân của người dùng hiện tại
const updateProfile = async (req, res) => {
  const userId = req.user.user_id;
  const { name, phone, avatar } = req.body;

  try {
    const [rows] = await pool.query('SELECT * FROM users WHERE user_id = ?', [userId]);
    if (rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy người dùng' });
    }

    const user = rows[0];

    // Nếu là tài khoản Google OAuth → chỉ cho phép cập nhật phone
    if (!user.password) {
      if (!phone) {
        return res.status(400).json({ success: false, message: 'Tài khoản Google chỉ được phép cập nhật số điện thoại' });
      }

      await pool.query('UPDATE users SET phone = ? WHERE user_id = ?', [phone, userId]);
      return res.json({ success: true, message: 'Cập nhật số điện thoại thành công', phone });
    }

    // Nếu là tài khoản thông thường → name, phone, avatar
    await pool.query('UPDATE users SET name = ?, phone = ?, avatar = ? WHERE user_id = ?', [name, phone, avatar, userId]);
    res.json({ success: true, message: 'Cập nhật thông tin thành công' });
  } catch (error) {
    console.error('❌ Lỗi updateProfile:', error);
    res.status(500).json({ success: false, message: 'Lỗi server' });
  }
};


// Đổi mật khẩu
const changePassword = async (req, res) => {
  const userId = req.user.user_id;
  const { oldPassword, newPassword } = req.body;
  if (!oldPassword || !newPassword) {
    return res.status(400).json({ success: false, message: 'Thiếu mật khẩu cũ hoặc mới' });
  }

  try {
    const [rows] = await pool.query('SELECT password FROM users WHERE user_id = ?', [userId]);
    const user = rows[0];
    if (!user || !user.password) return res.status(400).json({ success: false, message: 'Tài khoản không hợp lệ' });

    const isMatch = await bcrypt.compare(oldPassword, user.password);
    if (!isMatch) return res.status(401).json({ success: false, message: 'Mật khẩu cũ không đúng' });

    const hashed = await bcrypt.hash(newPassword, 10);
    await pool.query('UPDATE users SET password = ? WHERE user_id = ?', [hashed, userId]);

    res.json({ success: true, message: 'Đổi mật khẩu thành công' });
  } catch (error) {
    console.error('❌ Lỗi changePassword:', error);
    res.status(500).json({ success: false, message: 'Lỗi server' });
  }
};

// Quên mật khẩu (Gửi OTP)
const forgotPassword = async (req, res) => {
  const { email } = req.body;
  if (!email) return res.status(400).json({ success: false, message: 'Thiếu email' });

  try {
    const [rows] = await pool.query('SELECT * FROM users WHERE email = ?', [email]);
    if (rows.length === 0) return res.status(404).json({ success: false, message: 'Email chưa đăng ký' });

    const otpCode = Math.floor(100000 + Math.random() * 900000).toString();
    const expiredAt = new Date(Date.now() + 10 * 60 * 1000);

    await pool.query('INSERT INTO email_verifications (user_id, verification_code, expired_at) VALUES (?, ?, ?)', [
      rows[0].user_id, otpCode, expiredAt
    ]);

    await sendResetPasswordEmail(email, otpCode);
    res.json({ success: true, message: 'Đã gửi OTP đến email' });
  } catch (error) {
    console.error('❌ Lỗi forgotPassword:', error);
    res.status(500).json({ success: false, message: 'Lỗi server' });
  }
};

// Đặt lại mật khẩu bằng OTP
const resetPassword = async (req, res) => {
  const { email, otp, newPassword } = req.body;
  if (!email || !otp || !newPassword)
    return res.status(400).json({ success: false, message: 'Thiếu thông tin cần thiết' });

  try {
    const [users] = await pool.query('SELECT * FROM users WHERE email = ?', [email]);
    if (users.length === 0)
      return res.status(404).json({ success: false, message: 'Không tìm thấy người dùng' });

    const user = users[0];
    const [otpRows] = await pool.query(
      `SELECT * FROM email_verifications WHERE user_id = ? AND verification_code = ? AND is_used = FALSE AND expired_at > NOW()`,
      [user.user_id, otp]
    );

    if (otpRows.length === 0)
      return res.status(400).json({ success: false, message: 'OTP không hợp lệ hoặc hết hạn' });

    const hashed = await bcrypt.hash(newPassword, 10);
    await pool.query('UPDATE users SET password = ? WHERE user_id = ?', [hashed, user.user_id]);
    await pool.query('UPDATE email_verifications SET is_used = TRUE WHERE verification_code = ?', [otp]);

    res.json({ success: true, message: 'Đặt lại mật khẩu thành công' });
  } catch (error) {
    console.error('❌ Lỗi resetPassword:', error);
    res.status(500).json({ success: false, message: 'Lỗi server' });
  }
};

// Khóa/Mở tài khoản (admin)
const lockUser = async (req, res) => {
  const { id } = req.params;
  const { locked } = req.body;

  if (typeof locked !== 'boolean') {
    return res.status(400).json({ success: false, message: 'Giá trị locked phải là true hoặc false' });
  }

  try {
    await pool.query('UPDATE users SET is_locked = ? WHERE user_id = ?', [locked, id]);
    res.json({ success: true, message: locked ? 'Tài khoản đã bị khóa' : 'Tài khoản đã được mở khóa' });
  } catch (error) {
    console.error('❌ Lỗi lockUser:', error);
    res.status(500).json({ success: false, message: 'Lỗi server khi khóa tài khoản' });
  }
};

// Cập nhật vai trò của người dùng (admin)
const updateUserRole = async (req, res) => {
  const userId = req.params.id;
  const { role } = req.body;

  const validRoles = ['customer', 'staff', 'admin']; 
  if (!validRoles.includes(role)) {
    return res.status(400).json({ success: false, message: 'Role không hợp lệ' });
  }

  try {
    const [result] = await pool.query('UPDATE users SET role = ? WHERE user_id = ?', [role, userId]);
    if (result.affectedRows === 0) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy người dùng' });
    }

    res.json({ success: true, message: 'Cập nhật role thành công' });
  } catch (err) {
    console.error('❌ Lỗi cập nhật role:', err);
    res.status(500).json({ success: false, message: 'Lỗi server' });
  }
};


module.exports = {
  getAllUsers,
  searchUsers,
  getCurrentUser,
  getUserById,
  updateUser,
  updateProfile,
  changePassword,
  forgotPassword,
  resetPassword,
  lockUser,
  updateUserRole
};
