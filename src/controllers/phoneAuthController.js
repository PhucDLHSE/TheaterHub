const pool = require('../config/db');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');

const registerWithPhone = async (req, res) => {
  const { name, phone, password } = req.body;

  if (!name || !phone || !password)
    return res.status(400).json({ success: false, message: 'Vui lòng nhập đầy đủ thông tin' });

  try {
    const [exists] = await pool.query('SELECT * FROM users WHERE phone = ?', [phone]);
    if (exists.length > 0)
      return res.status(409).json({ success: false, message: 'Số điện thoại đã được đăng ký' });

    const hashedPassword = await bcrypt.hash(password, 10);
    const [result] = await pool.query(
      'INSERT INTO users (name, phone, password, role) VALUES (?, ?, ?, ?)',
      [name, phone, hashedPassword, 'customer']
    );

    const newUser = { user_id: result.insertId, name, phone, role: 'customer' };
    const token = jwt.sign(newUser, process.env.JWT_SECRET, { expiresIn: '7d' });

    res.status(201).json({
      success: true,
      message: 'Đăng ký thành công',
      token,
      user: newUser
    });
  } catch (error) {
    console.error('Lỗi đăng ký:', error);
    res.status(500).json({ success: false, message: 'Lỗi server' });
  }
};

const loginWithPhone = async (req, res) => {
  const { phone, password } = req.body;

  if (!phone || !password)
    return res.status(400).json({ success: false, message: 'Thiếu thông tin đăng nhập' });

  try {
    const [users] = await pool.query('SELECT * FROM users WHERE phone = ?', [phone]);
    if (users.length === 0)
      return res.status(401).json({ success: false, message: 'Số điện thoại chưa đăng ký' });

    const user = users[0];
    const isMatch = await bcrypt.compare(password, user.password);

    if (!isMatch)
      return res.status(401).json({ success: false, message: 'Sai mật khẩu' });

    const token = jwt.sign(
      {
        user_id: user.user_id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        role: user.role
      },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.json({
      success: true,
      message: 'Đăng nhập thành công',
      token,
      user: {
        user_id: user.user_id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        role: user.role
      }
    });
  } catch (error) {
    console.error('Lỗi đăng nhập:', error);
    res.status(500).json({ success: false, message: 'Lỗi server' });
  }
};

module.exports = { registerWithPhone, loginWithPhone };
