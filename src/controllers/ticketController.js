const pool = require("../config/db");

// 1. Danh sách vé đã mua của người dùng
const getPurchasedTickets = async (req, res) => {
  const userId = req.user.user_id;

  const query = `
    SELECT
      t.order_id,
      e.title AS event_title,
      s.seat_row,
      s.seat_number,
      CASE 
        WHEN e.event_type = 'general' THEN 'Vé vào cổng'
        WHEN e.event_type = 'zoned' THEN tt.type_name
        ELSE NULL
      END AS ticket_type_name,
      st.start_time AS showtime,
      l.name AS location_name,
      t.price,
      t.status
    FROM tickets t
    JOIN showtimes st ON t.showtime_id = st.showtime_id
    JOIN events e ON st.event_id = e.event_id
    JOIN locations l ON st.location_id = l.location_id
    LEFT JOIN ticket_types tt ON t.ticket_type_id = tt.ticket_type_id
    LEFT JOIN seats s ON t.seat_id = s.seat_id
    WHERE t.user_id = ?
      AND t.status = 'paid'
    ORDER BY t.booked_at DESC
  `;

  try {
    
    console.time("getTickets");
    const [rows] = await pool.query(query, [userId]);
    console.timeEnd("getTickets");
    res.json(rows);
  } catch (err) {
    console.error('Error fetching tickets:', err);
    res.status(500).json({ message: 'Lỗi khi lấy danh sách vé đã mua' });
  }
};

//2. Chi tiết vé đã mua
const getTicketOrderDetail = async (req, res) => {
  const userId = req.user.user_id;
  const orderId = req.params.orderId;

  const query = `
    SELECT
      t.order_id,
      e.title AS event_title,
      st.start_time AS showtime,
      l.name AS location_name,
      s.seat_row,
      s.seat_number,
      CASE 
        WHEN e.event_type = 'general' THEN 'Vé vào cổng'
        WHEN e.event_type = 'zoned' THEN tt.type_name
        ELSE NULL
      END AS ticket_type_name,
      t.price
    FROM tickets t
    JOIN showtimes st ON t.showtime_id = st.showtime_id
    JOIN events e ON st.event_id = e.event_id
    JOIN locations l ON st.location_id = l.location_id
    LEFT JOIN ticket_types tt ON t.ticket_type_id = tt.ticket_type_id
    LEFT JOIN seats s ON t.seat_id = s.seat_id
    WHERE t.user_id = ? AND t.order_id = ? AND t.status = 'paid'
  `;

  try {
    const [rows] = await pool.query(query, [userId, orderId]);

    if (rows.length === 0) {
      return res.status(404).json({ message: "Không tìm thấy đơn vé hoặc bạn không có quyền truy cập" });
    }

    const { order_id, event_title, showtime, location_name } = rows[0];

    const tickets = rows.map(row => ({
      seat_row: row.seat_row,
      seat_number: row.seat_number,
      ticket_type_name: row.ticket_type_name,
      price: row.price
    }));

    res.json({
      order_id,
      event_title,
      showtime,
      location_name,
      tickets
    });

  } catch (err) {
    console.error("Lỗi khi lấy chi tiết đơn vé:", err);
    res.status(500).json({ message: "Lỗi server khi lấy chi tiết đơn vé" });
  }
};

module.exports = {
  getPurchasedTickets,
  getTicketOrderDetail
};
