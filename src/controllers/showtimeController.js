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

// 6. Lấy danh sách ghế và giá của showtime
const getShowtimeSeatsWithPrice = async (req, res) => {
  const { showtimeId } = req.params;

  try {
    // 1. Kiểm tra showtime
    const [showtimeRows] = await pool.query(
      `SELECT s.showtime_id, s.event_id, s.location_id, e.event_type
       FROM showtimes s
       JOIN events e ON s.event_id = e.event_id
       WHERE s.showtime_id = ?`,
      [showtimeId]
    );

    if (showtimeRows.length === 0) {
      return res.status(404).json({ success: false, message: "Không tìm thấy suất chiếu" });
    }

    const { location_id, event_type } = showtimeRows[0];
    if (event_type !== 'seated') {
      return res.status(400).json({ success: false, message: "Suất chiếu này không áp dụng cho loại sự kiện chọn ghế (seated)" });
    }

    // 2. Lấy thông tin seat_prices của showtime đó
    const [seatPrices] = await pool.query(
      `SELECT seat_type_code, price FROM seat_prices WHERE showtime_id = ?`,
      [showtimeId]
    );
    const priceMap = {};
    seatPrices.forEach(row => priceMap[row.seat_type_code] = row.price);

    // 3. Lấy danh sách tất cả ghế tại location đó
    const [seats] = await pool.query(
      `SELECT s.seat_id, s.seat_row, s.seat_number, s.seat_type_code, st.seat_type_name
       FROM seats s
       JOIN seat_types st ON s.seat_type_code = st.seat_type_code
       WHERE s.location_id = ?
       ORDER BY s.seat_row ASC, s.seat_number ASC`,
      [location_id]
    );

    // 4. Trả về danh sách ghế + giá
    const seatsWithPrice = seats.map(seat => ({
      seat_id: seat.seat_id,
      seat_row: seat.seat_row,
      seat_number: seat.seat_number,
      seat_type_code: seat.seat_type_code,
      seat_type_name: seat.seat_type_name,
      price: priceMap[seat.seat_type_code] || null,
      status: 'available'
    }));

    res.json({
      success: true,
      showtime_id: parseInt(showtimeId),
      location_id,
      seats: seatsWithPrice
    });
  } catch (err) {
    console.error("❌ Lỗi getShowtimeSeatsWithPrice:", err);
    res.status(500).json({ success: false, message: "Lỗi server" });
  }
};

module.exports = {
  createShowtime,
  getShowtimesByEvent,
  getShowtimeById,
  updateShowtime,
  deleteShowtime,
  getShowtimeSeatsWithPrice
};
