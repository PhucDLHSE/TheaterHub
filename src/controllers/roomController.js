const pool = require("../config/db");

// CREATE 
const createRoom = async (req, res) => {
  try {
    const { theater_id, name } = req.body;

    // Validate input
    if (!theater_id || !name) {
      return res.status(400).json({
        success: false,
        message: "Thiếu thông tin bắt buộc: theater_id và name"
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
        message: "Không tìm thấy rạp chiếu phim"
      });
    }

    // Check if room name already exists in this theater
    const [existingRoom] = await pool.query(
      "SELECT room_id FROM rooms WHERE theater_id = ? AND name = ?",
      [theater_id, name]
    );

    if (existingRoom.length > 0) {
      return res.status(400).json({
        success: false,
        message: "Tên phòng đã tồn tại trong rạp này"
      });
    }

    // Check if this is the first room being created
    const [roomCount] = await pool.query("SELECT COUNT(*) as count FROM rooms");
    
    // If no rooms exist, reset auto increment to start from 1
    if (roomCount[0].count === 0) {
      await pool.query("ALTER TABLE rooms AUTO_INCREMENT = 1");
    }

    // Create room
    const [result] = await pool.query(
      "INSERT INTO rooms (theater_id, name) VALUES (?, ?)",
      [theater_id, name]
    );

    return res.status(201).json({
      success: true,
      message: "Tạo phòng thành công",
      room: {
        room_id: result.insertId,
        theater_id,
        name
      }
    });
  } catch (error) {
    console.error("❌ Lỗi tạo phòng:", error);
    return res.status(500).json({
      success: false,
      message: "Lỗi server",
      error: error.message
    });
  }
};

// READ 
const getAllRooms = async (req, res) => {
  try {
    const [rooms] = await pool.query(`
      SELECT r.room_id, r.name, r.theater_id, t.name as theater_name
      FROM rooms r
      JOIN theaters t ON r.theater_id = t.theater_id
      ORDER BY t.name, r.name
    `);

    return res.status(200).json({
      success: true,
      message: "Lấy danh sách phòng thành công",
      rooms
    });
  } catch (error) {
    console.error("❌ Lỗi lấy danh sách phòng:", error);
    return res.status(500).json({
      success: false,
      message: "Lỗi server",
      error: error.message
    });
  }
};

// READ BY ID ROOM
const getRoomById = async (req, res) => {
  try {
    const { room_id } = req.params;

    const [rooms] = await pool.query(`
      SELECT r.room_id, r.name, r.theater_id, t.name as theater_name
      FROM rooms r
      JOIN theaters t ON r.theater_id = t.theater_id
      WHERE r.room_id = ?
    `, [room_id]);

    if (rooms.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Không tìm thấy phòng"
      });
    }

    return res.status(200).json({
      success: true,
      message: "Lấy thông tin phòng thành công",
      room: rooms[0]
    });
  } catch (error) {
    console.error("❌ Lỗi lấy thông tin phòng:", error);
    return res.status(500).json({
      success: false,
      message: "Lỗi server",
      error: error.message
    });
  }
};

// READ BY ID THEATER
const getRoomsByTheater = async (req, res) => {
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
        message: "Không tìm thấy rạp chiếu phim"
      });
    }

    const [rooms] = await pool.query(`
      SELECT r.room_id, r.name, r.theater_id, t.name as theater_name
      FROM rooms r
      JOIN theaters t ON r.theater_id = t.theater_id
      WHERE r.theater_id = ?
      ORDER BY r.name
    `, [theater_id]);

    return res.status(200).json({
      success: true,
      message: "Lấy danh sách phòng theo rạp thành công",
      theater: {
        theater_id: parseInt(theater_id),
        theater_name: rooms.length > 0 ? rooms[0].theater_name : null
      },
      rooms
    });
  } catch (error) {
    console.error("❌ Lỗi lấy danh sách phòng theo rạp:", error);
    return res.status(500).json({
      success: false,
      message: "Lỗi server",
      error: error.message
    });
  }
};

// UPDATE
const updateRoom = async (req, res) => {
  try {
    const { room_id } = req.params;
    const { theater_id, name } = req.body;

    // Validate input
    if (!theater_id || !name) {
      return res.status(400).json({
        success: false,
        message: "Thiếu thông tin bắt buộc: theater_id và name"
      });
    }

    // Check if room exists
    const [roomCheck] = await pool.query(
      "SELECT room_id FROM rooms WHERE room_id = ?",
      [room_id]
    );

    if (roomCheck.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Không tìm thấy phòng"
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
        message: "Không tìm thấy rạp chiếu phim"
      });
    }

    // Check if room name already exists in this theater (excluding current room)
    const [existingRoom] = await pool.query(
      "SELECT room_id FROM rooms WHERE theater_id = ? AND name = ? AND room_id != ?",
      [theater_id, name, room_id]
    );

    if (existingRoom.length > 0) {
      return res.status(400).json({
        success: false,
        message: "Tên phòng đã tồn tại trong rạp này"
      });
    }

    // Update room
    await pool.query(
      "UPDATE rooms SET theater_id = ?, name = ? WHERE room_id = ?",
      [theater_id, name, room_id]
    );

    return res.status(200).json({
      success: true,
      message: "Cập nhật phòng thành công",
      room: {
        room_id: parseInt(room_id),
        theater_id,
        name
      }
    });
  } catch (error) {
    console.error("❌ Lỗi cập nhật phòng:", error);
    return res.status(500).json({
      success: false,
      message: "Lỗi server",
      error: error.message
    });
  }
};

// DELETE 
const deleteRoom = async (req, res) => {
  try {
    const { room_id } = req.params;

    // Check if room exists
    const [roomCheck] = await pool.query(
      "SELECT room_id FROM rooms WHERE room_id = ?",
      [room_id]
    );

    if (roomCheck.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Không tìm thấy phòng"
      });
    }

    // Check if room is being used in showtimes
    const [showtimeCheck] = await pool.query(
      "SELECT showtime_id FROM showtimes WHERE room_id = ?",
      [room_id]
    );

    if (showtimeCheck.length > 0) {
      return res.status(400).json({
        success: false,
        message: "Không thể xóa phòng vì đang được sử dụng trong lịch chiếu"
      });
    }

    // Check if room has seats
    const [seatCheck] = await pool.query(
      "SELECT seat_id FROM seats WHERE room_id = ?",
      [room_id]
    );

    if (seatCheck.length > 0) {
      return res.status(400).json({
        success: false,
        message: "Không thể xóa phòng vì đang có ghế được thiết lập"
      });
    }

    // Delete room
    await pool.query("DELETE FROM rooms WHERE room_id = ?", [room_id]);

    return res.status(200).json({
      success: true,
      message: "Xóa phòng thành công"
    });
  } catch (error) {
    console.error("❌ Lỗi xóa phòng:", error);
    return res.status(500).json({
      success: false,
      message: "Lỗi server",
      error: error.message
    });
  }
};

module.exports = {
  createRoom,
  getAllRooms,
  getRoomById,
  getRoomsByTheater,
  updateRoom,
  deleteRoom
}; 