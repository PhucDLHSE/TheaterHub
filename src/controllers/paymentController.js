const pool = require("../config/db");
const { payOS } = require("../utils/payos");

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

    // Kiểm tra trạng thái thanh toán thành công
    if (data.code === "00" || data.status === "PAID") {
      const orderId = data.orderCode;

      // 1. Cập nhật trạng thái đơn từ 'reserved' -> 'paid'
      const [orderResult] = await pool.query(
        `UPDATE ticket_orders SET status = 'paid' WHERE order_id = ? AND status = 'reserved'`,
        [orderId]
      );

      // Nếu không có đơn hàng nào được cập nhật (vd: đã là 'paid' hoặc sai mã)
      if (orderResult.affectedRows === 0) {
        console.warn(`⚠️ Không tìm thấy đơn hàng cần cập nhật hoặc đã thanh toán: order_id = ${orderId}`);
        return res.status(200).json({ success: false, message: "Đơn hàng không hợp lệ hoặc đã thanh toán" });
      }

      // 2. Cập nhật tất cả vé trong đơn thành 'paid'
      await pool.query(
        `UPDATE tickets SET status = 'paid' WHERE order_id = ?`,
        [orderId]
      );

      // 3. Trừ số lượng vé theo ticket_type (nếu có)
      const [ticketTypeCounts] = await pool.query(`
        SELECT ticket_type_id, COUNT(*) AS count
        FROM tickets
        WHERE order_id = ? AND ticket_type_id IS NOT NULL
        GROUP BY ticket_type_id
      `, [orderId]);

      for (const row of ticketTypeCounts) {
        await pool.query(`
          UPDATE ticket_types
          SET quantity = GREATEST(quantity - ?, 0)
          WHERE ticket_type_id = ?
        `, [row.count, row.ticket_type_id]);
      }

      console.log(`✅ Đã xử lý webhook cho order_id = ${orderId}`);
      return res.status(200).json({ success: true, message: "Thanh toán thành công, đã cập nhật đơn hàng" });
    }

    // Không xử lý trạng thái khác
    return res.status(200).json({ success: false, message: "Không phải trạng thái đã thanh toán" });

  } catch (err) {
    console.error("❌ Lỗi xử lý webhook:", err);
    return res.status(500).json({ success: false, message: "Lỗi server khi xử lý webhook" });
  }
};


module.exports = {
  createPaymentLink,
  handlePayOSWebhook
};
