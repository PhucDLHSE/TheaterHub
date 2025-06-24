const pool = require("../config/db");

// CREATE
const createSeat = async (req, res) => {
  try {
    const { room_id, seat_row, seat_number, seat_type_code } = req.body;
    if (!room_id || !seat_row || !seat_number || !seat_type_code) {
      return res.status(400).json({ success: false, message: "Thiếu thông tin bắt buộc" });
    }
    // Check room exists
    const [room] = await pool.query("SELECT room_id FROM rooms WHERE room_id = ?", [room_id]);
    if (room.length === 0) {
      return res.status(404).json({ success: false, message: "Không tìm thấy phòng" });
    }
    // Check seat_type exists
    const [type] = await pool.query("SELECT seat_type_code FROM seat_types WHERE seat_type_code = ?", [seat_type_code]);
    if (type.length === 0) {
      return res.status(404).json({ success: false, message: "Không tìm thấy loại ghế" });
    }
    // Check unique seat in room
    const [exists] = await pool.query("SELECT seat_id FROM seats WHERE room_id = ? AND seat_row = ? AND seat_number = ?", [room_id, seat_row, seat_number]);
    if (exists.length > 0) {
      return res.status(400).json({ success: false, message: "Ghế đã tồn tại trong phòng này" });
    }
    const [result] = await pool.query("INSERT INTO seats (room_id, seat_row, seat_number, seat_type_code) VALUES (?, ?, ?, ?)", [room_id, seat_row, seat_number, seat_type_code]);
    return res.status(201).json({ success: true, message: "Tạo ghế thành công", seat_id: result.insertId });
  } catch (error) {
    return res.status(500).json({ success: false, message: "Lỗi server", error: error.message });
  }
};

// READ ALL
const getAllSeats = async (req, res) => {
  try {
    const [rows] = await pool.query(`
      SELECT s.*, r.name as room_name, t.seat_type_name
      FROM seats s
      JOIN rooms r ON s.room_id = r.room_id
      JOIN seat_types t ON s.seat_type_code = t.seat_type_code
      ORDER BY s.room_id, s.seat_row, s.seat_number
    `);
    return res.status(200).json({ success: true, seats: rows });
  } catch (error) {
    return res.status(500).json({ success: false, message: "Lỗi server", error: error.message });
  }
};

// READ BY ID
const getSeatById = async (req, res) => {
  try {
    const { seat_id } = req.params;
    const [rows] = await pool.query(`
      SELECT s.*, r.name as room_name, t.seat_type_name
      FROM seats s
      JOIN rooms r ON s.room_id = r.room_id
      JOIN seat_types t ON s.seat_type_code = t.seat_type_code
      WHERE s.seat_id = ?
    `, [seat_id]);
    if (rows.length === 0) {
      return res.status(404).json({ success: false, message: "Không tìm thấy ghế" });
    }
    return res.status(200).json({ success: true, seat: rows[0] });
  } catch (error) {
    return res.status(500).json({ success: false, message: "Lỗi server", error: error.message });
  }
};

// UPDATE
const updateSeat = async (req, res) => {
  try {
    const { seat_id } = req.params;
    const { room_id, seat_row, seat_number, seat_type_code } = req.body;
    if (!room_id || !seat_row || !seat_number || !seat_type_code) {
      return res.status(400).json({ success: false, message: "Thiếu thông tin bắt buộc" });
    }
    // Check seat exists
    const [seat] = await pool.query("SELECT seat_id FROM seats WHERE seat_id = ?", [seat_id]);
    if (seat.length === 0) {
      return res.status(404).json({ success: false, message: "Không tìm thấy ghế" });
    }
    // Check room exists
    const [room] = await pool.query("SELECT room_id FROM rooms WHERE room_id = ?", [room_id]);
    if (room.length === 0) {
      return res.status(404).json({ success: false, message: "Không tìm thấy phòng" });
    }
    // Check seat_type exists
    const [type] = await pool.query("SELECT seat_type_code FROM seat_types WHERE seat_type_code = ?", [seat_type_code]);
    if (type.length === 0) {
      return res.status(404).json({ success: false, message: "Không tìm thấy loại ghế" });
    }
    // Check unique seat in room (trừ ghế hiện tại)
    const [exists] = await pool.query("SELECT seat_id FROM seats WHERE room_id = ? AND seat_row = ? AND seat_number = ? AND seat_id != ?", [room_id, seat_row, seat_number, seat_id]);
    if (exists.length > 0) {
      return res.status(400).json({ success: false, message: "Ghế đã tồn tại trong phòng này" });
    }
    await pool.query("UPDATE seats SET room_id = ?, seat_row = ?, seat_number = ?, seat_type_code = ? WHERE seat_id = ?", [room_id, seat_row, seat_number, seat_type_code, seat_id]);
    return res.status(200).json({ success: true, message: "Cập nhật ghế thành công" });
  } catch (error) {
    return res.status(500).json({ success: false, message: "Lỗi server", error: error.message });
  }
};

// DELETE
const deleteSeat = async (req, res) => {
  try {
    const { seat_id } = req.params;
    // Check if seat is used in tickets
    const [used] = await pool.query("SELECT ticket_id FROM tickets WHERE seat_id = ?", [seat_id]);
    if (used.length > 0) {
      return res.status(400).json({ success: false, message: "Không thể xóa ghế đã được đặt vé" });
    }
    const [result] = await pool.query("DELETE FROM seats WHERE seat_id = ?", [seat_id]);
    if (result.affectedRows === 0) {
      return res.status(404).json({ success: false, message: "Không tìm thấy ghế" });
    }
    return res.status(200).json({ success: true, message: "Xóa ghế thành công" });
  } catch (error) {
    return res.status(500).json({ success: false, message: "Lỗi server", error: error.message });
  }
};

module.exports = {
  createSeat,
  getAllSeats,
  getSeatById,
  updateSeat,
  deleteSeat
}; 