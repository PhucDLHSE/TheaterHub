const pool = require("../config/db");

// CREATE
const createShowtime = async (req, res) => {
  try {
    const { event_id, room_id, start_time } = req.body;
    if (!event_id || !room_id || !start_time) {
      return res.status(400).json({ success: false, message: "Thiếu thông tin bắt buộc" });
    }
    // Check event exists
    const [event] = await pool.query("SELECT event_id FROM events WHERE event_id = ?", [event_id]);
    if (event.length === 0) {
      return res.status(404).json({ success: false, message: "Không tìm thấy sự kiện" });
    }
    // Check room exists
    const [room] = await pool.query("SELECT room_id FROM rooms WHERE room_id = ?", [room_id]);
    if (room.length === 0) {
      return res.status(404).json({ success: false, message: "Không tìm thấy phòng" });
    }
    // Check start_time is not in the past
    const now = new Date();
    const start = new Date(start_time);
    if (start < now) {
      return res.status(400).json({ success: false, message: "Không thể tạo suất chiếu trong quá khứ" });
    }
    const [result] = await pool.query("INSERT INTO showtimes (event_id, room_id, start_time) VALUES (?, ?, ?)", [event_id, room_id, start_time]);
    return res.status(201).json({ success: true, message: "Tạo suất chiếu thành công", showtime_id: result.insertId });
  } catch (error) {
    return res.status(500).json({ success: false, message: "Lỗi server", error: error.message });
  }
};

// READ ALL
const getAllShowtimes = async (req, res) => {
  try {
    const [rows] = await pool.query(`
      SELECT s.*, e.title as event_title, r.name as room_name
      FROM showtimes s
      JOIN events e ON s.event_id = e.event_id
      JOIN rooms r ON s.room_id = r.room_id
      ORDER BY s.start_time DESC
    `);
    const formattedRows = await Promise.all(rows.map(async (row) => {
      const start = new Date(row.start_time);
      const vnTime = new Date(start.getTime() + 7 * 60 * 60 * 1000); 
      return {
        ...row,
        start_time: vnTime.toISOString().split('T')[0] + ' ' + vnTime.toISOString().split('T')[1].slice(0, 5)
      };
    }));
    return res.status(200).json({ success: true, showtimes: formattedRows });
  } catch (error) {
    return res.status(500).json({ success: false, message: "Lỗi server", error: error.message });
  }
};

// READ BY ID
const getShowtimeById = async (req, res) => {
  try {
    const { showtime_id } = req.params;
    const [rows] = await pool.query(`
      SELECT s.*, e.title as event_title, r.name as room_name
      FROM showtimes s
      JOIN events e ON s.event_id = e.event_id
      JOIN rooms r ON s.room_id = r.room_id
      WHERE s.showtime_id = ?
    `, [showtime_id]);
    if (rows.length === 0) {
      return res.status(404).json({ success: false, message: "Không tìm thấy suất chiếu" });
    }
    const row = rows[0];
    const start = new Date(row.start_time);
    const vnTime = new Date(start.getTime() + 7 * 60 * 60 * 1000); // Cộng thêm 7 tiếng
    return res.status(200).json({ success: true, showtime: { ...row, start_time: vnTime.toISOString().split('T')[0] + ' ' + vnTime.toISOString().split('T')[1].slice(0, 5) } });
  } catch (error) {
    return res.status(500).json({ success: false, message: "Lỗi server", error: error.message });
  }
};

// UPDATE
const updateShowtime = async (req, res) => {
  try {
    const { showtime_id } = req.params;
    const { event_id, room_id, start_time } = req.body;
    if (!event_id || !room_id || !start_time) {
      return res.status(400).json({ success: false, message: "Thiếu thông tin bắt buộc" });
    }
    // Check showtime exists
    const [showtime] = await pool.query("SELECT showtime_id FROM showtimes WHERE showtime_id = ?", [showtime_id]);
    if (showtime.length === 0) {
      return res.status(404).json({ success: false, message: "Không tìm thấy suất chiếu" });
    }
    // Check event exists
    const [event] = await pool.query("SELECT event_id FROM events WHERE event_id = ?", [event_id]);
    if (event.length === 0) {
      return res.status(404).json({ success: false, message: "Không tìm thấy sự kiện" });
    }
    // Check room exists
    const [room] = await pool.query("SELECT room_id FROM rooms WHERE room_id = ?", [room_id]);
    if (room.length === 0) {
      return res.status(404).json({ success: false, message: "Không tìm thấy phòng" });
    }
    await pool.query("UPDATE showtimes SET event_id = ?, room_id = ?, start_time = ? WHERE showtime_id = ?", [event_id, room_id, start_time, showtime_id]);
    return res.status(200).json({ success: true, message: "Cập nhật suất chiếu thành công" });
  } catch (error) {
    return res.status(500).json({ success: false, message: "Lỗi server", error: error.message });
  }
};

// DELETE
const deleteShowtime = async (req, res) => {
  try {
    const { showtime_id } = req.params;
    // Check if showtime is used in tickets
    const [used] = await pool.query("SELECT ticket_id FROM tickets WHERE showtime_id = ?", [showtime_id]);
    if (used.length > 0) {
      return res.status(400).json({ success: false, message: "Không thể xóa suất chiếu đã có vé đặt" });
    }
    const [result] = await pool.query("DELETE FROM showtimes WHERE showtime_id = ?", [showtime_id]);
    if (result.affectedRows === 0) {
      return res.status(404).json({ success: false, message: "Không tìm thấy suất chiếu" });
    }
    return res.status(200).json({ success: true, message: "Xóa suất chiếu thành công" });
  } catch (error) {
    return res.status(500).json({ success: false, message: "Lỗi server", error: error.message });
  }
};

module.exports = {
  createShowtime,
  getAllShowtimes,
  getShowtimeById,
  updateShowtime,
  deleteShowtime
}; 