const pool = require("../config/db");

const updateEventStatus = async (req, res) => {
  const { eventId } = req.params;
  const status = req.body.status;

  const allowedStatus = ['draft', 'pending', 'upcoming', 'canceled'];
  if (!allowedStatus.includes(status)) {
    return res.status(400).json({ success: false, message: "Trạng thái không hợp lệ" });
  }

  try {
    const [rows] = await pool.query(
      `SELECT event_id, status, title FROM events WHERE event_id = ?`,
      [eventId]
    );
    if (rows.length === 0) {
      return res.status(404).json({ success: false, message: "Không tìm thấy sự kiện" });
    }

    const currentStatus = rows[0].status;
    const title = rows[0].title;
    const role = req.user?.role;

    if (!role) {
      return res.status(403).json({ success: false, message: "Không xác định được vai trò người dùng" });
    }

    const validTransitions = {
      staff: new Set([
        'draft->pending',
        'draft->canceled',
        'canceled->draft',
        'upcoming->canceled',
        'pending->canceled',
        'pending->draft'
      ]),
      admin: new Set([
        'pending->upcoming',
        'pending->canceled',
        'upcoming->canceled'
      ])
    };

    const transitionKey = `${currentStatus}->${status}`;
    const isAllowed = validTransitions[role]?.has(transitionKey);

    if (!isAllowed) {
      return res.status(403).json({ success: false, message: "Bạn không có quyền cập nhật trạng thái này" });
    }

    await pool.query(`UPDATE events SET status = ? WHERE event_id = ?`, [status, eventId]);

    let message = "Sự kiện đã được cập nhật.";
    if (role === 'staff') {
      if (status === 'pending') message = `Sự kiện '${title}' đã được gửi và đang chờ duyệt`;
      else if (status === 'canceled') message = `Sự kiện '${title}' đã được hủy`;
      else if (status === 'draft') message = `Sự kiện '${title}' đã được hoạt động trở lại`;
    } else if (role === 'admin') {
      if (status === 'upcoming') message = `Sự kiện '${title}' đã được duyệt`;
      else if (status === 'canceled') message = `Sự kiện '${title}' đã được hủy`;
    }

    res.json({ success: true, message });
  } catch (error) {
    console.error("❌ Lỗi updateEventStatus:", error);
    res.status(500).json({ success: false, message: "Lỗi server" });
  }
};

module.exports = { updateEventStatus };
