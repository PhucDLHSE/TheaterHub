const pool = require("../config/db");

// CREATE
const createTicket = async (req, res) => {
  try {
    const { showtime_id, seat_id, ticket_type_id, user_id, status } = req.body;
    if (!showtime_id || !user_id || (!seat_id && !ticket_type_id)) {
      return res.status(400).json({ success: false, message: "Thiếu thông tin bắt buộc" });
    }
    // Check showtime exists
    const [showtime] = await pool.query("SELECT showtime_id FROM showtimes WHERE showtime_id = ?", [showtime_id]);
    if (showtime.length === 0) {
      return res.status(404).json({ success: false, message: "Không tìm thấy suất chiếu" });
    }
    // Check user exists
    const [user] = await pool.query("SELECT user_id FROM users WHERE user_id = ?", [user_id]);
    if (user.length === 0) {
      return res.status(404).json({ success: false, message: "Không tìm thấy người dùng" });
    }
    // Check seat or ticket_type exists
    if (seat_id) {
      const [seat] = await pool.query("SELECT seat_id FROM seats WHERE seat_id = ?", [seat_id]);
      if (seat.length === 0) {
        return res.status(404).json({ success: false, message: "Không tìm thấy ghế" });
      }
    }
    if (ticket_type_id) {
      const [type] = await pool.query("SELECT ticket_type_id FROM ticket_types WHERE ticket_type_id = ?", [ticket_type_id]);
      if (type.length === 0) {
        return res.status(404).json({ success: false, message: "Không tìm thấy loại vé" });
      }
    }
    const [result] = await pool.query(
      "INSERT INTO tickets (showtime_id, seat_id, ticket_type_id, user_id, status) VALUES (?, ?, ?, ?, ?)",
      [showtime_id, seat_id || null, ticket_type_id || null, user_id, status || 'booked']
    );
    return res.status(201).json({ success: true, message: "Đặt vé thành công", ticket_id: result.insertId });
  } catch (error) {
    return res.status(500).json({ success: false, message: "Lỗi server", error: error.message });
  }
};

// READ ALL
const getAllTickets = async (req, res) => {
  try {
    const [rows] = await pool.query(`
      SELECT t.*, s.start_time, s.room_id, u.name as user_name
      FROM tickets t
      JOIN showtimes s ON t.showtime_id = s.showtime_id
      JOIN users u ON t.user_id = u.user_id
      ORDER BY t.booked_at DESC
    `);
    return res.status(200).json({ success: true, tickets: rows });
  } catch (error) {
    return res.status(500).json({ success: false, message: "Lỗi server", error: error.message });
  }
};

// READ BY ID
const getTicketById = async (req, res) => {
  try {
    const { ticket_id } = req.params;
    const [rows] = await pool.query(`
      SELECT t.*, s.start_time, s.room_id, u.name as user_name
      FROM tickets t
      JOIN showtimes s ON t.showtime_id = s.showtime_id
      JOIN users u ON t.user_id = u.user_id
      WHERE t.ticket_id = ?
    `, [ticket_id]);
    if (rows.length === 0) {
      return res.status(404).json({ success: false, message: "Không tìm thấy vé" });
    }
    return res.status(200).json({ success: true, ticket: rows[0] });
  } catch (error) {
    return res.status(500).json({ success: false, message: "Lỗi server", error: error.message });
  }
};

// UPDATE
const updateTicket = async (req, res) => {
  try {
    const { ticket_id } = req.params;
    const { status } = req.body;
    if (!status) {
      return res.status(400).json({ success: false, message: "Thiếu trạng thái vé" });
    }
    // Check ticket exists
    const [ticket] = await pool.query("SELECT ticket_id FROM tickets WHERE ticket_id = ?", [ticket_id]);
    if (ticket.length === 0) {
      return res.status(404).json({ success: false, message: "Không tìm thấy vé" });
    }
    await pool.query("UPDATE tickets SET status = ? WHERE ticket_id = ?", [status, ticket_id]);
    return res.status(200).json({ success: true, message: "Cập nhật vé thành công" });
  } catch (error) {
    return res.status(500).json({ success: false, message: "Lỗi server", error: error.message });
  }
};

// DELETE
const deleteTicket = async (req, res) => {
  try {
    const { ticket_id } = req.params;
    const [result] = await pool.query("DELETE FROM tickets WHERE ticket_id = ?", [ticket_id]);
    if (result.affectedRows === 0) {
      return res.status(404).json({ success: false, message: "Không tìm thấy vé" });
    }
    return res.status(200).json({ success: true, message: "Xóa vé thành công" });
  } catch (error) {
    return res.status(500).json({ success: false, message: "Lỗi server", error: error.message });
  }
};

module.exports = {
  createTicket,
  getAllTickets,
  getTicketById,
  updateTicket,
  deleteTicket
}; 