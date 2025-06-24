const pool = require("../config/db"); 

// 1. Tạo showtime cho 1 sự kiện (Payload 2)
const createShowtime = async (req, res) => {
  const { eventId } = req.params;
  const { location_id, start_time } = req.body;

  try {
    const [eventRows] = await pool.execute('SELECT * FROM events WHERE event_id = ?', [eventId]);
    if (eventRows.length === 0) return res.status(404).json({ message: 'Event not found' });

    await pool.execute(
      'INSERT INTO showtimes (event_id, location_id, start_time) VALUES (?, ?, ?)',
      [eventId, location_id, start_time]
    );

    res.status(201).json({ message: 'Showtime created successfully' });
  } catch (err) {
    res.status(500).json({ message: 'Error creating showtime', error: err.message });
  }
};

// 2. Lấy tất cả showtimes của một sự kiện
const getShowtimesByEvent = async (req, res) => {
  const { eventId } = req.params;

  try {
    const [rows] = await pool.execute(
      `SELECT s.*, l.name AS location_name 
       FROM showtimes s 
       JOIN locations l ON s.location_id = l.location_id 
       WHERE s.event_id = ?`,
      [eventId]
    );
    res.json(rows);
  } catch (err) {
    res.status(500).json({ message: 'Error fetching showtimes', error: err.message });
  }
};

// 3. Cập nhật showtime theo ID
const updateShowtime = async (req, res) => {
  const { showtimeId } = req.params;
  const { location_id, start_time } = req.body; // 🟢 Lúc này req.body sẽ không còn undefined

  try {
    const [existRows] = await pool.execute(
      `SELECT * FROM showtimes WHERE showtime_id = ?`,
      [showtimeId]
    );

    if (existRows.length === 0) {
      return res.status(404).json({ success: false, message: "Không tìm thấy showtime" });
    }

    const fields = [];
    const values = [];

    if (location_id !== undefined && location_id !== '') {
      fields.push("location_id = ?");
      values.push(location_id);
    }

    if (start_time !== undefined && start_time !== '') {
      fields.push("start_time = ?");
      values.push(start_time);
    }

    if (fields.length === 0) {
      return res.status(400).json({ success: false, message: "Không có dữ liệu để cập nhật" });
    }

    values.push(showtimeId);
    const query = `UPDATE showtimes SET ${fields.join(", ")} WHERE showtime_id = ?`;
    await pool.execute(query, values);

    return res.status(200).json({ success: true, message: "Cập nhật showtime thành công" });
  } catch (error) {
    console.error("❌ Lỗi khi cập nhật showtime:", error);
    return res.status(500).json({ success: false, message: "Lỗi server" });
  }
};

// 4. Xóa showtime theo ID
const deleteShowtime = async (req, res) => {
  const { showtimeId } = req.params;

  try {
    const [result] = await pool.execute('DELETE FROM showtimes WHERE showtime_id = ?', [showtimeId]);
    if (result.affectedRows === 0) return res.status(404).json({ message: 'Showtime not found' });
    res.json({ message: 'Xóa showtime thành công!' });
  } catch (err) {
    res.status(500).json({ message: 'Không thể xóa showtime!', error: err.message });
  }
};

// 5. Lấy showtime theo ID
const getShowtimeById = async (req, res) => {
  const { showtimeId } = req.params;

  try {
    const [rows] = await pool.execute(
      `SELECT s.*, l.name AS location_name
       FROM showtimes s
       JOIN locations l ON s.location_id = l.location_id
       WHERE s.showtime_id = ?`,
      [showtimeId]
    );
    if (rows.length === 0) return res.status(404).json({ message: 'Showtime not found' });
    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ message: 'Error fetching showtime', error: err.message });
  }
};

module.exports = {
  createShowtime,
  getShowtimesByEvent,
  getShowtimeById,
  updateShowtime,
  deleteShowtime,
};
