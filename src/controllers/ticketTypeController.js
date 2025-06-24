const pool = require("../config/db");

// CREATE
const createTicketType = async (req, res) => {
  try {
    const { showtime_id, type_name, price, quantity } = req.body;
    if (!showtime_id || !type_name || price == null || quantity == null) {
      return res.status(400).json({ success: false, message: "Thiếu thông tin bắt buộc" });
    }
    // Check showtime exists
    const [showtime] = await pool.query("SELECT showtime_id FROM showtimes WHERE showtime_id = ?", [showtime_id]);
    if (showtime.length === 0) {
      return res.status(404).json({ success: false, message: "Không tìm thấy suất chiếu" });
    }
    const [result] = await pool.query("INSERT INTO ticket_types (showtime_id, type_name, price, quantity) VALUES (?, ?, ?, ?)", [showtime_id, type_name, price, quantity]);
    return res.status(201).json({ success: true, message: "Tạo loại vé thành công", ticket_type_id: result.insertId });
  } catch (error) {
    return res.status(500).json({ success: false, message: "Lỗi server", error: error.message });
  }
};

// READ ALL
const getAllTicketTypes = async (req, res) => {
  try {
    const [rows] = await pool.query(`
      SELECT t.*, s.start_time, s.room_id, s.event_id
      FROM ticket_types t
      JOIN showtimes s ON t.showtime_id = s.showtime_id
      ORDER BY t.ticket_type_id DESC
    `);
    return res.status(200).json({ success: true, ticket_types: rows });
  } catch (error) {
    return res.status(500).json({ success: false, message: "Lỗi server", error: error.message });
  }
};

// READ BY ID
const getTicketTypeById = async (req, res) => {
  try {
    const { ticket_type_id } = req.params;
    const [rows] = await pool.query(`
      SELECT t.*, s.start_time, s.room_id, s.event_id
      FROM ticket_types t
      JOIN showtimes s ON t.showtime_id = s.showtime_id
      WHERE t.ticket_type_id = ?
    `, [ticket_type_id]);
    if (rows.length === 0) {
      return res.status(404).json({ success: false, message: "Không tìm thấy loại vé" });
    }
    return res.status(200).json({ success: true, ticket_type: rows[0] });
  } catch (error) {
    return res.status(500).json({ success: false, message: "Lỗi server", error: error.message });
  }
};

// UPDATE
const updateTicketType = async (req, res) => {
  try {
    const { ticket_type_id } = req.params;
    const { showtime_id, type_name, price, quantity } = req.body;
    if (!showtime_id || !type_name || price == null || quantity == null) {
      return res.status(400).json({ success: false, message: "Thiếu thông tin bắt buộc" });
    }
    // Check ticket_type exists
    const [ticketType] = await pool.query("SELECT ticket_type_id FROM ticket_types WHERE ticket_type_id = ?", [ticket_type_id]);
    if (ticketType.length === 0) {
      return res.status(404).json({ success: false, message: "Không tìm thấy loại vé" });
    }
    // Check showtime exists
    const [showtime] = await pool.query("SELECT showtime_id FROM showtimes WHERE showtime_id = ?", [showtime_id]);
    if (showtime.length === 0) {
      return res.status(404).json({ success: false, message: "Không tìm thấy suất chiếu" });
    }
    await pool.query("UPDATE ticket_types SET showtime_id = ?, type_name = ?, price = ?, quantity = ? WHERE ticket_type_id = ?", [showtime_id, type_name, price, quantity, ticket_type_id]);
    return res.status(200).json({ success: true, message: "Cập nhật loại vé thành công" });
  } catch (error) {
    return res.status(500).json({ success: false, message: "Lỗi server", error: error.message });
  }
};

// DELETE
const deleteTicketType = async (req, res) => {
  try {
    const { ticket_type_id } = req.params;
    // Check if ticket_type is used in tickets
    const [used] = await pool.query("SELECT ticket_id FROM tickets WHERE ticket_type_id = ?", [ticket_type_id]);
    if (used.length > 0) {
      return res.status(400).json({ success: false, message: "Không thể xóa loại vé đã có vé đặt" });
    }
    const [result] = await pool.query("DELETE FROM ticket_types WHERE ticket_type_id = ?", [ticket_type_id]);
    if (result.affectedRows === 0) {
      return res.status(404).json({ success: false, message: "Không tìm thấy loại vé" });
    }
    return res.status(200).json({ success: true, message: "Xóa loại vé thành công" });
  } catch (error) {
    return res.status(500).json({ success: false, message: "Lỗi server", error: error.message });
  }
};

module.exports = {
  createTicketType,
  getAllTicketTypes,
  getTicketTypeById,
  updateTicketType,
  deleteTicketType
}; 