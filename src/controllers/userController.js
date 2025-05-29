const pool = require('../config/db');

// Lấy danh sách tất cả user (admin)
const getAllUsers = async (req, res) => {
  try {
    const [users] = await pool.query('SELECT user_id, name, email, phone, role, avatar FROM users');
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
      'SELECT user_id, name, email, phone, role, avatar FROM users WHERE name LIKE ? OR email LIKE ?',
      [`%${query}%`, `%${query}%`]
    );
    res.json({ success: true, users });
  } catch (error) {
    console.error('❌ Lỗi searchUsers:', error);
    res.status(500).json({ success: false, message: 'Lỗi server khi tìm kiếm người dùng' });
  }
};

// Lấy thông tin 1 user (admin hoặc chính chủ)
const getUserById = async (req, res) => {
  const { id } = req.params;

  try {
    const [users] = await pool.query('SELECT user_id, name, email, phone, role, avatar FROM users WHERE user_id = ?', [id]);
    if (users.length === 0) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy người dùng' });
    }
    res.json({ success: true, user: users[0] });
  } catch (error) {
    console.error('❌ Lỗi getUserById:', error);
    res.status(500).json({ success: false, message: 'Lỗi server khi lấy thông tin người dùng' });
  }
};

// Cập nhật thông tin user (chính chủ hoặc admin)
const updateUser = async (req, res) => {
  const { id } = req.params;
  const { name, phone, avatar } = req.body;

  try {
    await pool.query(
      'UPDATE users SET name = ?, phone = ?, avatar = ? WHERE user_id = ?',
      [name, phone, avatar, id]
    );

    res.json({ success: true, message: 'Cập nhật thông tin thành công' });
  } catch (error) {
    console.error('❌ Lỗi updateUser:', error);
    res.status(500).json({ success: false, message: 'Lỗi server khi cập nhật thông tin' });
  }
};

// Cập nhật số điện thoại riêng (chính chủ)
const updatePhone = async (req, res) => {
  const userId = req.user.user_id;
  const { phone } = req.body;

  if (!phone) {
    return res.status(400).json({
      success: false,
      message: 'Vui lòng cung cấp số điện thoại'
    });
  }

  try {
    await pool.query('UPDATE users SET phone = ? WHERE user_id = ?', [phone, userId]);

    res.status(200).json({
      success: true,
      message: 'Cập nhật số điện thoại thành công',
      phone
    });
  } catch (error) {
    console.error('❌ Lỗi updatePhone:', error);
    res.status(500).json({
      success: false,
      message: 'Có lỗi xảy ra khi cập nhật số điện thoại'
    });
  }
};

// Xóa user (admin)
const deleteUser = async (req, res) => {
  const { id } = req.params;

  try {
    await pool.query('DELETE FROM users WHERE user_id = ?', [id]);
    res.json({ success: true, message: 'Xóa người dùng thành công' });
  } catch (error) {
    console.error('❌ Lỗi deleteUser:', error);
    res.status(500).json({ success: false, message: 'Lỗi server khi xóa người dùng' });
  }
};

module.exports = {
  getAllUsers,
  searchUsers,
  getUserById,
  updateUser,
  updatePhone,
  deleteUser
};
