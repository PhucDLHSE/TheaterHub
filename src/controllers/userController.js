const pool = require('../config/db');

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
    console.error('Lỗi khi cập nhật số điện thoại:', error);
    res.status(500).json({
      success: false,
      message: 'Có lỗi xảy ra khi cập nhật số điện thoại'
    });
  }
};

module.exports = {
  updatePhone,
};
