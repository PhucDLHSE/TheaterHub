const pool = require("../config/db"); 

// 1. Tạo ticket types cho 1 event
// POST /api/events/:eventId/ticket-types/:showtimeId
const createTicketType = async (req, res) => {
  const { eventId, showtimeId } = req.params;
  const { ticket_types } = req.body;

  if (!Array.isArray(ticket_types) || ticket_types.length === 0) {
    return res.status(400).json({ success: false, message: "Danh sách ticket_types không hợp lệ" });
  }

  try {
    // Lấy event_type từ sự kiện liên kết với showtime
    const [eventRows] = await pool.execute(`
      SELECT e.event_type
      FROM showtimes s
      JOIN events e ON s.event_id = e.event_id
      WHERE s.showtime_id = ?
    `, [showtimeId]);

    if (eventRows.length === 0) {
      return res.status(404).json({ success: false, message: "Không tìm thấy showtime hoặc sự kiện" });
    }

    const { event_type } = eventRows[0];

    // Validate input tùy theo event_type
    const insertValues = [];
    for (const tt of ticket_types) {
      if (event_type === 'zoned') {
        if (!tt.type_name || !tt.price || !tt.quantity) {
          return res.status(400).json({ success: false, message: "Thiếu type_name / price / quantity cho zoned" });
        }
        insertValues.push([showtimeId, tt.type_name, tt.price, tt.quantity]);
      } else if (event_type === 'general') {
        if (!tt.price || !tt.quantity) {
          return res.status(400).json({ success: false, message: "Thiếu price / quantity cho general" });
        }
        insertValues.push([showtimeId, null, tt.price, tt.quantity]);
      } else {
        return res.status(400).json({ success: false, message: "event_type không được hỗ trợ" });
      }
    }

    await pool.query(`
      INSERT INTO ticket_types (showtime_id, type_name, price, quantity)
      VALUES ?
    `, [insertValues]);

    return res.status(201).json({ success: true, message: "Thêm loại vé thành công" });
  } catch (err) {
    console.error("❌ Lỗi khi thêm ticket_types:", err);
    return res.status(500).json({ success: false, message: "Lỗi server" });
  }
};

// 2. Lấy ticket types theo event_id
// GET /api/events/:eventId/ticket-types
const getTicketTypesByEvent = async (req, res) => {
  const { eventId } = req.params;

  try {
    const [rows] = await pool.execute(
      `SELECT tt.*, s.showtime_id, s.start_time, s.location_id
       FROM ticket_types tt
       JOIN showtimes s ON tt.showtime_id = s.showtime_id
       WHERE s.event_id = ?`,
      [eventId]
    );

    return res.status(200).json({ success: true, ticket_types: rows });
  } catch (err) {
    console.error("❌ Lỗi lấy danh sách loại vé:", err);
    return res.status(500).json({ success: false, message: "Lỗi server" });
  }
};

// 3. Cập nhật ticket type theo ID
// PATCH /api/events/:eventId/ticket-types/:ticketTypeId
const updateTicketType = async (req, res) => {
  const { ticketTypeId } = req.params;
  const fields = ['type_name', 'price', 'quantity'];

  const updates = [];
  const values = [];

  for (let field of fields) {
    if (req.body[field] !== undefined) {
      updates.push(`${field} = ?`);
      values.push(req.body[field]);
    }
  }

  if (updates.length === 0) {
    return res.status(400).json({ success: false, message: "Không có dữ liệu để cập nhật" });
  }

  try {
    values.push(ticketTypeId);
    await pool.execute(
      `UPDATE ticket_types SET ${updates.join(', ')} WHERE ticket_type_id = ?`,
      values
    );

    return res.status(200).json({ success: true, message: "Cập nhật loại vé thành công" });
  } catch (err) {
    console.error("❌ Lỗi cập nhật loại vé:", err);
    return res.status(500).json({ success: false, message: "Lỗi server" });
  }
};

// 4. Xoá ticket type theo ID
// DELETE /api/events/:eventId/ticket-types/:ticketTypeId
const deleteTicketType = async (req, res) => {
  const { ticketTypeId } = req.params;

  try {
    await pool.execute(`DELETE FROM ticket_types WHERE ticket_type_id = ?`, [ticketTypeId]);
    return res.status(200).json({ success: true, message: "Xoá loại vé thành công" });
  } catch (err) {
    console.error("❌ Lỗi xoá loại vé:", err);
    return res.status(500).json({ success: false, message: "Lỗi server" });
  }
};

module.exports = {
  createTicketType,
  getTicketTypesByEvent,
  updateTicketType,
  deleteTicketType,
};
