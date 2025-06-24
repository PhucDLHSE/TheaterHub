const pool = require("../config/db");

// CREATE - Tạo rạp mới
const createTheater = async (req, res) => {
  try {
    const { name, location } = req.body;

    // Validate input
    if (!name || !location) {
      return res.status(400).json({
        success: false,
        message: "Thiếu thông tin bắt buộc: name và location"
      });
    }

    // Check if theater name already exists
    const [existingTheater] = await pool.query(
      "SELECT theater_id FROM theaters WHERE name = ?",
      [name]
    );

    if (existingTheater.length > 0) {
      return res.status(400).json({
        success: false,
        message: "Tên rạp đã tồn tại"
      });
    }

    // Check if this is the first theater being created
    const [theaterCount] = await pool.query("SELECT COUNT(*) as count FROM theaters");
    
    // If no theaters exist, reset auto increment to start from 1
    if (theaterCount[0].count === 0) {
      await pool.query("ALTER TABLE theaters AUTO_INCREMENT = 1");
    }

    // Create theater
    const [result] = await pool.query(
      "INSERT INTO theaters (name, location) VALUES (?, ?)",
      [name, location]
    );

    return res.status(201).json({
      success: true,
      message: "Tạo rạp thành công",
      theater: {
        theater_id: result.insertId,
        name,
        location
      }
    });
  } catch (error) {
    console.error("❌ Lỗi tạo rạp:", error);
    return res.status(500).json({
      success: false,
      message: "Lỗi server",
      error: error.message
    });
  }
};

// READ - Lấy danh sách tất cả rạp
const getAllTheaters = async (req, res) => {
  try {
    const [theaters] = await pool.query(`
      SELECT t.theater_id, t.name, t.location,
             COUNT(r.room_id) as room_count
      FROM theaters t
      LEFT JOIN rooms r ON t.theater_id = r.theater_id
      GROUP BY t.theater_id, t.name, t.location
      ORDER BY t.name
    `);

    return res.status(200).json({
      success: true,
      message: "Lấy danh sách rạp thành công",
      theaters
    });
  } catch (error) {
    console.error("❌ Lỗi lấy danh sách rạp:", error);
    return res.status(500).json({
      success: false,
      message: "Lỗi server",
      error: error.message
    });
  }
};

// READ - Lấy rạp theo ID
const getTheaterById = async (req, res) => {
  try {
    const { theater_id } = req.params;

    const [theaters] = await pool.query(`
      SELECT t.theater_id, t.name, t.location,
             COUNT(r.room_id) as room_count
      FROM theaters t
      LEFT JOIN rooms r ON t.theater_id = r.theater_id
      WHERE t.theater_id = ?
      GROUP BY t.theater_id, t.name, t.location
    `, [theater_id]);

    if (theaters.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Không tìm thấy rạp"
      });
    }

    // Get rooms for this theater
    const [rooms] = await pool.query(`
      SELECT room_id, name
      FROM rooms
      WHERE theater_id = ?
      ORDER BY name
    `, [theater_id]);

    return res.status(200).json({
      success: true,
      message: "Lấy thông tin rạp thành công",
      theater: {
        ...theaters[0],
        rooms
      }
    });
  } catch (error) {
    console.error("❌ Lỗi lấy thông tin rạp:", error);
    return res.status(500).json({
      success: false,
      message: "Lỗi server",
      error: error.message
    });
  }
};

// UPDATE - Cập nhật thông tin rạp
const updateTheater = async (req, res) => {
  try {
    const { theater_id } = req.params;
    const { name, location } = req.body;

    // Validate input
    if (!name || !location) {
      return res.status(400).json({
        success: false,
        message: "Thiếu thông tin bắt buộc: name và location"
      });
    }

    // Check if theater exists
    const [theaterCheck] = await pool.query(
      "SELECT theater_id FROM theaters WHERE theater_id = ?",
      [theater_id]
    );

    if (theaterCheck.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Không tìm thấy rạp"
      });
    }

    // Check if theater name already exists (excluding current theater)
    const [existingTheater] = await pool.query(
      "SELECT theater_id FROM theaters WHERE name = ? AND theater_id != ?",
      [name, theater_id]
    );

    if (existingTheater.length > 0) {
      return res.status(400).json({
        success: false,
        message: "Tên rạp đã tồn tại"
      });
    }

    // Update theater
    await pool.query(
      "UPDATE theaters SET name = ?, location = ? WHERE theater_id = ?",
      [name, location, theater_id]
    );

    return res.status(200).json({
      success: true,
      message: "Cập nhật rạp thành công",
      theater: {
        theater_id: parseInt(theater_id),
        name,
        location
      }
    });
  } catch (error) {
    console.error("❌ Lỗi cập nhật rạp:", error);
    return res.status(500).json({
      success: false,
      message: "Lỗi server",
      error: error.message
    });
  }
};

// DELETE - Xóa rạp
const deleteTheater = async (req, res) => {
  try {
    const { theater_id } = req.params;

    // Check if theater exists
    const [theaterCheck] = await pool.query(
      "SELECT theater_id FROM theaters WHERE theater_id = ?",
      [theater_id]
    );

    if (theaterCheck.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Không tìm thấy rạp"
      });
    }

    // Check if theater has rooms
    const [roomCheck] = await pool.query(
      "SELECT room_id FROM rooms WHERE theater_id = ?",
      [theater_id]
    );

    if (roomCheck.length > 0) {
      return res.status(400).json({
        success: false,
        message: "Không thể xóa rạp vì đang có phòng được thiết lập"
      });
    }

    // Check if theater is being used in showtimes
    const [showtimeCheck] = await pool.query(`
      SELECT s.showtime_id 
      FROM showtimes s
      JOIN rooms r ON s.room_id = r.room_id
      WHERE r.theater_id = ?
    `, [theater_id]);

    if (showtimeCheck.length > 0) {
      return res.status(400).json({
        success: false,
        message: "Không thể xóa rạp vì đang được sử dụng trong lịch chiếu"
      });
    }

    // Delete theater
    await pool.query("DELETE FROM theaters WHERE theater_id = ?", [theater_id]);

    return res.status(200).json({
      success: true,
      message: "Xóa rạp thành công"
    });
  } catch (error) {
    console.error("❌ Lỗi xóa rạp:", error);
    return res.status(500).json({
      success: false,
      message: "Lỗi server",
      error: error.message
    });
  }
};

module.exports = {
  createTheater,
  getAllTheaters,
  getTheaterById,
  updateTheater,
  deleteTheater
}; 