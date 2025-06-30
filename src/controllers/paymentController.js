const pool = require("../config/db");
const { payOS } = require("../utils/payos");
const { sendTicketEmail } = require('../services/sendTicketEmail');


const createPaymentLink = async (req, res) => {
  const user_id = req.user.user_id;
  const { order_id } = req.body;
  try {
    const [[order]] = await pool.query(`
      SELECT o.order_id, o.total_amount, e.title AS event_title
      FROM ticket_orders o
      JOIN events e ON o.event_id = e.event_id
      WHERE o.order_id = ? AND o.user_id = ?
    `, [order_id, user_id]);

    if (!order) {
      return res.status(404).json({ success: false, message: "Không tìm thấy đơn hàng." });
    }

    const description = `Thanh toán: ${order.event_title}`;
    const truncatedDescription = description.length > 25
     ? description.slice(0, 25)
     : description;

    const paymentRequest = {
      orderCode: order.order_id,
      amount: parseInt(order.total_amount),
      description: truncatedDescription,
      returnUrl: "https://theaterhub.vn/thanh-toan/thanh-cong",
      cancelUrl: "https://theaterhub.vn/thanh-toan/that-bai"
    };

    const paymentLink = await payOS.createPaymentLink(paymentRequest);

    res.json({ success: true, paymentLink });
  } catch (error) {
    console.error("❌ Lỗi createPaymentLink:", error?.response?.data || error);
    res.status(500).json({ success: false, message: "Lỗi khi tạo link thanh toán" });
  }
};

const handlePayOSWebhook = async (req, res) => {
  try {
    const data = req.body.data;
    console.log("📩 Webhook PayOS:", data);

    if (data.code === "00" || data.status === "PAID") {
      const orderCode = data.orderCode;

      // 1. Cập nhật đơn và vé
      await pool.query(`UPDATE ticket_orders SET status = 'paid' WHERE order_id = ?`, [orderCode]);
      await pool.query(`UPDATE tickets SET status = 'paid' WHERE order_id = ?`, [orderCode]);

      // 2. Giảm số lượng vé theo ticket_type (chỉ áp dụng cho general hoặc zoned)
      const [ticketTypeCounts] = await pool.query(`
        SELECT ticket_type_id, COUNT(*) AS count
        FROM tickets
        WHERE order_id = ? AND ticket_type_id IS NOT NULL
        GROUP BY ticket_type_id
      `, [orderCode]);

      // 4. Gửi email vé
      await sendTicketEmail(order.email, order.name, ticketDetails);

      for (const row of ticketTypeCounts) {
        await pool.query(`
          UPDATE ticket_types
          SET quantity = GREATEST(quantity - ?, 0)
          WHERE ticket_type_id = ?
        `, [row.count, row.ticket_type_id]);
      }
      // 3. Truy vấn thông tin đơn hàng và danh sách vé
      const [[order]] = await pool.query(`
        SELECT u.email, u.name
        FROM ticket_orders o
        JOIN users u ON o.user_id = u.user_id
        WHERE o.order_id = ?
      `, [orderCode]);

      const [ticketDetails] = await pool.query(`
      SELECT t.ticket_id, e.title AS event_title, s.start_time, l.name AS location_name,
          tt.name AS ticket_type_name, t.seat_label
      FROM tickets t
      JOIN events e ON t.event_id = e.event_id
      JOIN showtimes s ON t.showtime_id = s.showtime_id
      JOIN locations l ON s.location_id = l.location_id
      LEFT JOIN ticket_types tt ON t.ticket_type_id = tt.ticket_type_id
      WHERE t.order_id = ?
      `, [orderCode]);

      // 4. Gửi vé qua Email
      await sendTicketEmail(order.email, order.name, ticketDetails);
      return res.status(200).json({ success: true, message: "Cập nhật trạng thái đơn hàng thành công" });
    }

    // Không xử lý các trạng thái khác
    res.status(200).json({ success: false, message: "Trạng thái không xử lý" });

  } catch (err) {
    console.error("❌ Lỗi xử lý webhook:", err);
    res.status(500).json({ success: false, message: "Lỗi server khi xử lý webhook" });
  }
};

module.exports = {
  createPaymentLink,
  handlePayOSWebhook
};
