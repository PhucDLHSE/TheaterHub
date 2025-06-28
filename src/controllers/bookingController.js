// controllers/bookingController.js
const pool = require("../config/db");
const dayjs = require("dayjs");
require("dayjs/locale/vi");
const utc = require("dayjs/plugin/utc");
const timezone = require("dayjs/plugin/timezone");
dayjs.extend(utc);
dayjs.extend(timezone);

// 1. Đặt vé cho event dạng seated
const bookSeatedTickets = async (req, res) => {
  const user_id = req.user.user_id;
  const { showtime_id, seat_ids } = req.body;

  if (!showtime_id || !Array.isArray(seat_ids) || seat_ids.length === 0) {
    return res.status(400).json({ success: false, message: "Thiếu thông tin showtime hoặc danh sách ghế" });
  }

  try {
    // 1. Lấy event_id, location, time từ showtime
    const [[showtime]] = await pool.query(
      `SELECT s.event_id, s.start_time, s.location_id, e.title, l.name AS location_name
       FROM showtimes s
       JOIN events e ON s.event_id = e.event_id
       JOIN locations l ON s.location_id = l.location_id
       WHERE s.showtime_id = ?`,
      [showtime_id]
    );

    if (!showtime) {
      return res.status(404).json({ success: false, message: "Không tìm thấy suất chiếu" });
    }

    const { event_id, start_time, location_id, title, location_name } = showtime;

    // 2. Lấy giá từng loại ghế của showtime
    const [seatPriceRows] = await pool.query(
      `SELECT seat_type_code, price FROM seat_prices WHERE showtime_id = ?`,
      [showtime_id]
    );
    const priceMap = {};
    for (const row of seatPriceRows) {
      priceMap[row.seat_type_code] = row.price;
    }

    // 3. Lấy thông tin ghế để tính tổng tiền
    const [seatRows] = await pool.query(
      `SELECT s.seat_id, s.seat_type_code, s.seat_row, s.seat_number, st.seat_type_name
       FROM seats s
       JOIN seat_types st ON s.seat_type_code = st.seat_type_code
       WHERE s.seat_id IN (?)`,
      [seat_ids]
    );

    if (seatRows.length !== seat_ids.length) {
      return res.status(400).json({ success: false, message: "Một số ghế không tồn tại" });
    }

    // 4. Tính tổng tiền
    let total = 0;
    const ticketData = seatRows.map(seat => {
      const price = priceMap[seat.seat_type_code];
      total += price;
      return {
        seat_id: seat.seat_id,
        seat_row: seat.seat_row,
        seat_number: seat.seat_number,
        seat_type_name: seat.seat_type_name,
        seat_type_code: seat.seat_type_code,
        price
      };
    });

    // 5. Tạo order (timeout giữ vé: 10 phút)
    const [orderResult] = await pool.query(
      `INSERT INTO ticket_orders (user_id, event_id, total_amount, expires_at)
       VALUES (?, ?, ?, DATE_ADD(NOW(), INTERVAL 10 MINUTE))`,
      [user_id, event_id, total]
    );
    const order_id = orderResult.insertId;

    // 6. Insert từng vé vào bảng tickets
    const values = ticketData.map(t => [showtime_id, t.price, t.seat_id, null, user_id, 'reserved', order_id]);

    await pool.query(
      `INSERT INTO tickets (showtime_id, price, seat_id, ticket_type_id, user_id, status, order_id)
       VALUES ?`,
      [values]
    );

    res.json({
      success: true,
      message: "Đặt vé thành công",
      order_id,
      event_title: title,
      location_name,
      start_time: dayjs(start_time).tz("Asia/Ho_Chi_Minh").format(),
      total_amount: total,
      tickets: ticketData
    });
  } catch (err) {
    console.error("❌ Lỗi bookSeatedTickets:", err);
    res.status(500).json({ success: false, message: "Lỗi server" });
  }
};

// 2. Lấy thông tin chi tiết đơn hàng
const getOrderDetails = async (req, res) => {
  const { orderId } = req.params;
  const user_id = req.user.user_id;

  try {
    // 1. Lấy thông tin đơn hàng
    const [[order]] = await pool.query(`
      SELECT o.order_id, o.status, o.total_amount, o.expires_at, o.created_at,
             e.title AS event_title, l.name AS location_name, s.start_time
      FROM ticket_orders o
      JOIN events e ON o.event_id = e.event_id
      JOIN tickets t ON t.order_id = o.order_id
      JOIN showtimes s ON t.showtime_id = s.showtime_id
      JOIN locations l ON s.location_id = l.location_id
      WHERE o.order_id = ? AND o.user_id = ?
    `, [orderId, user_id]);

    if (!order) {
      return res.status(404).json({ success: false, message: "Không tìm thấy đơn hàng" });
    }

    // 2. Lấy danh sách vé thuộc đơn hàng
    const [ticketRows] = await pool.query(`
      SELECT t.ticket_id, t.price, t.seat_id, s.seat_row, s.seat_number, st.seat_type_name
      FROM tickets t
      JOIN seats s ON t.seat_id = s.seat_id
      JOIN seat_types st ON s.seat_type_code = st.seat_type_code
      WHERE t.order_id = ?
    `, [orderId]);

    const tickets = ticketRows.map(t => ({
      seat_id: t.seat_id,
      seat_row: t.seat_row,
      seat_number: t.seat_number,
      seat_type_name: t.seat_type_name,
      price: t.price
    }));

    res.json({
      success: true,
      order: {
        order_id: order.order_id,
        status: order.status,
        total_amount: order.total_amount,
        created_at: order.created_at,
        expires_at: order.expires_at,
        event_title: order.event_title,
        location_name: order.location_name,
        start_time: dayjs(order.start_time).tz("Asia/Ho_Chi_Minh").format(),
        tickets
      }
    });
  } catch (err) {
    console.error("❌ Lỗi getOrderDetails:", err);
    res.status(500).json({ success: false, message: "Lỗi server" });
  }
};

// 3. Huỷ đơn hàng
// Chỉ huỷ được đơn hàng ở trạng thái 'reserved' và chưa hết hạn
const cancelOrder = async (req, res) => {
  const { orderId } = req.params;
  const user_id = req.user.user_id;

  try {
    // 1. Lấy thông tin đơn hàng
    const [[order]] = await pool.query(
      `SELECT status, expires_at FROM ticket_orders
       WHERE order_id = ? AND user_id = ?`,
      [orderId, user_id]
    );

    if (!order) {
      return res.status(404).json({ success: false, message: "Không tìm thấy đơn hàng" });
    }

    if (order.status !== 'reserved') {
      return res.status(400).json({ success: false, message: "Chỉ có thể huỷ đơn hàng ở trạng thái 'reserved'" });
    }

    const now = dayjs();
    const expiresAt = dayjs(order.expires_at);
    if (expiresAt.isBefore(now)) {
      return res.status(400).json({ success: false, message: "Đơn hàng đã hết hạn, không thể huỷ" });
    }

    const conn = await pool.getConnection();
    try {
      await conn.beginTransaction();

      // 2. Cập nhật trạng thái đơn hàng
      await conn.query(
        `UPDATE ticket_orders SET status = 'cancelled' WHERE order_id = ?`,
        [orderId]
      );

      // 3. Cập nhật trạng thái các vé thuộc đơn hàng
      await conn.query(
        `UPDATE tickets SET status = 'cancelled' WHERE order_id = ?`,
        [orderId]
      );

      await conn.commit();
      res.json({ success: true, message: "Đã huỷ đơn vé thành công" });
    } catch (err) {
      await conn.rollback();
      console.error("❌ Lỗi huỷ vé:", err);
      res.status(500).json({ success: false, message: "Lỗi server" });
    } finally {
      conn.release();
    }
  } catch (err) {
    console.error("❌ Lỗi cancelOrder:", err);
    res.status(500).json({ success: false, message: "Lỗi server" });
  }
};

module.exports = { bookSeatedTickets, getOrderDetails, cancelOrder };
