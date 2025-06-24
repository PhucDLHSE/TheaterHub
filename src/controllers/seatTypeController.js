const pool = require("../config/db");

// CREATE
const createSeatType = async (req, res) => {
  try {
    const { seat_type_code, seat_type_name } = req.body;
    if (!seat_type_code || !seat_type_name) {
      return res.status(400).json({ success: false, message: "Thiếu mã loại ghế hoặc tên loại ghế" });
    }
    // Check if exists
    const [exists] = await pool.query("SELECT seat_type_code FROM seat_types WHERE seat_type_code = ?", [seat_type_code]);
    if (exists.length > 0) {
      return res.status(400).json({ success: false, message: "Mã loại ghế đã tồn tại" });
    }
    await pool.query("INSERT INTO seat_types (seat_type_code, seat_type_name) VALUES (?, ?)", [seat_type_code, seat_type_name]);
    return res.status(201).json({ success: true, message: "Tạo loại ghế thành công" });
  } catch (error) {
    return res.status(500).json({ success: false, message: "Lỗi server", error: error.message });
  }
};

// READ ALL
const getAllSeatTypes = async (req, res) => {
  try {
    const [rows] = await pool.query("SELECT * FROM seat_types");
    return res.status(200).json({ success: true, seat_types: rows });
  } catch (error) {
    return res.status(500).json({ success: false, message: "Lỗi server", error: error.message });
  }
};

// READ BY CODE
const getSeatTypeByCode = async (req, res) => {
  try {
    const { seat_type_code } = req.params;
    const [rows] = await pool.query("SELECT * FROM seat_types WHERE seat_type_code = ?", [seat_type_code]);
    if (rows.length === 0) {
      return res.status(404).json({ success: false, message: "Không tìm thấy loại ghế" });
    }
    return res.status(200).json({ success: true, seat_type: rows[0] });
  } catch (error) {
    return res.status(500).json({ success: false, message: "Lỗi server", error: error.message });
  }
};

// UPDATE
const updateSeatType = async (req, res) => {
  try {
    const { seat_type_code } = req.params;
    const { seat_type_name } = req.body;
    if (!seat_type_name) {
      return res.status(400).json({ success: false, message: "Thiếu tên loại ghế" });
    }
    const [result] = await pool.query("UPDATE seat_types SET seat_type_name = ? WHERE seat_type_code = ?", [seat_type_name, seat_type_code]);
    if (result.affectedRows === 0) {
      return res.status(404).json({ success: false, message: "Không tìm thấy loại ghế" });
    }
    return res.status(200).json({ success: true, message: "Cập nhật loại ghế thành công" });
  } catch (error) {
    return res.status(500).json({ success: false, message: "Lỗi server", error: error.message });
  }
};

// DELETE
const deleteSeatType = async (req, res) => {
  try {
    const { seat_type_code } = req.params;
    // Check if being used in seats or seat_prices
    const [usedSeats] = await pool.query("SELECT seat_id FROM seats WHERE seat_type_code = ?", [seat_type_code]);
    const [usedPrices] = await pool.query("SELECT seat_price_id FROM seat_prices WHERE seat_type_code = ?", [seat_type_code]);
    if (usedSeats.length > 0 || usedPrices.length > 0) {
      return res.status(400).json({ success: false, message: "Không thể xóa loại ghế đang được sử dụng" });
    }
    const [result] = await pool.query("DELETE FROM seat_types WHERE seat_type_code = ?", [seat_type_code]);
    if (result.affectedRows === 0) {
      return res.status(404).json({ success: false, message: "Không tìm thấy loại ghế" });
    }
    return res.status(200).json({ success: true, message: "Xóa loại ghế thành công" });
  } catch (error) {
    return res.status(500).json({ success: false, message: "Lỗi server", error: error.message });
  }
};

module.exports = {
  createSeatType,
  getAllSeatTypes,
  getSeatTypeByCode,
  updateSeatType,
  deleteSeatType
}; 