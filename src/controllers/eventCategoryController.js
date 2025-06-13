const db = require('../config/db');
const pool = require('../config/db');

// Tạo loại sự kiện
const createEventCategory = async (req, res) => {
  const { category_name, slug } = req.body;

  if (!category_name || !slug) {
    return res.status(400).json({ success: false, message: 'Thiếu category_name hoặc slug' });
  }

  try {
    const [exist] = await db.execute('SELECT * FROM event_categories WHERE slug = ?', [slug]);
    if (exist.length > 0) {
      return res.status(400).json({ success: false, message: 'Slug đã tồn tại' });
    }

    await db.execute('INSERT INTO event_categories (category_name, slug) VALUES (?, ?)', [category_name, slug]);
    res.status(201).json({ success: true, message: 'Tạo loại sự kiện thành công' });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Lỗi server', error: err.message });
  }
};

// Lấy loại sự kiện theo ID
const getEventCategoryById = async (req, res) => {
  const { category_id } = req.params;

  try {
    const [rows] = await pool.execute(
      'SELECT * FROM event_categories WHERE category_id = ?',
      [category_id]
    );

    if (rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy loại sự kiện.' });
    }

    return res.json({ success: true, data: rows[0] });
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Lỗi server', error: err.message });
  }
};

// Lấy tất cả loại sự kiện
const getAllEventCategories = async (req, res) => {
  try {
    const [rows] = await db.execute('SELECT * FROM event_categories ORDER BY category_id DESC');
    res.json({ success: true, data: rows });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Lỗi server', error: err.message });
  }
};

const updateEventCategory = async (req, res) => {
  const { category_id } = req.params;
  const { category_name, slug } = req.body;

  try {
    let sql = 'UPDATE event_categories SET ';
    const updates = [];
    const values = [];

    if (category_name !== undefined) {
      updates.push('category_name = ?');
      values.push(category_name);
    }

    if (slug !== undefined) {
      updates.push('slug = ?');
      values.push(slug);
    }

    if (updates.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Vui lòng cung cấp ít nhất một trường để cập nhật.',
      });
    }

    sql += updates.join(', ') + ' WHERE category_id = ?';
    values.push(category_id);

    const [result] = await pool.execute(sql, values);

    if (result.affectedRows === 0) {
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy danh mục sự kiện cần cập nhật.',
      });
    }

    return res.json({
      success: true,
      message: 'Cập nhật danh mục sự kiện thành công.',
    });
  } catch (error) {
    console.error('Lỗi updateEventCategory:', error);
    return res.status(500).json({
      success: false,
      message: 'Lỗi máy chủ.',
    });
  }
};

// Xóa loại sự kiện
const deleteEventCategory = async (req, res) => {
  const { category_id } = req.params;

  try {
    await db.execute('DELETE FROM event_categories WHERE category_id = ?', [category_id]);
    res.json({ success: true, message: 'Xóa thành công' });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Lỗi server', error: err.message });
  }
};

module.exports = {
  createEventCategory,
  getEventCategoryById,
  getAllEventCategories,
  updateEventCategory,
  deleteEventCategory
};
