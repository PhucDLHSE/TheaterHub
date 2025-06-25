const pool = require("../config/db");

// 1. Tạo loại ghế (seat_types)
const createSeatType = async (req, res) => {
  const { seat_type_code, seat_type_name } = req.body;
  try {
    if (!seat_type_code || !seat_type_name) {
      return res.status(400).json({ message: "Thiếu mã loại ghế hoặc tên loại ghế" });
    }

    await pool.execute(
      `INSERT INTO seat_types (seat_type_code, seat_type_name) VALUES (?, ?)`,
      [seat_type_code, seat_type_name]
    );

    res.status(201).json({ success: true, message: "Tạo loại ghế thành công" });
  } catch (error) {
    console.error("❌ Lỗi tạo seat_type:", error);
    res.status(500).json({ success: false, message: "Lỗi server" });
  }
};

// 2. Tạo danh sách ghế (seats) cho location
const createSeatsForLocation = async (req, res) => {
  const { location_id, seats } = req.body;

  if (!location_id || !Array.isArray(seats)) {
    return res.status(400).json({ message: "Thiếu location_id hoặc danh sách seats" });
  }

  try {
    const values = seats.map(seat => [
      location_id,
      seat.seat_row,
      seat.seat_number,
      seat.seat_type_code
    ]);

    await pool.query(
      `INSERT INTO seats (location_id, seat_row, seat_number, seat_type_code)
       VALUES ?`, [values]
    );

    res.status(201).json({ success: true, message: "Tạo danh sách ghế thành công" });
  } catch (error) {
    console.error("❌ Lỗi tạo seats:", error);
    res.status(500).json({ success: false, message: "Lỗi server" });
  }
};

// 3. Cấu hình giá vé theo loại ghế cho 1 showtime (seat_prices)
const setSeatPrices = async (req, res) => {
  const { event_id, showtime_id, seat_prices } = req.body;

  if (!event_id || !showtime_id || !Array.isArray(seat_prices) || seat_prices.length === 0) {
    return res.status(400).json({ message: "Thiếu event_id, showtime_id hoặc seat_prices không hợp lệ" });
  }

  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    for (const sp of seat_prices) {
      const { seat_type_code, price } = sp;
      if (!seat_type_code || typeof price !== 'number') {
        await conn.rollback();
        return res.status(400).json({ message: "Dữ liệu không hợp lệ trong seat_prices" });
      }

      await conn.query(
        `INSERT INTO seat_prices (showtime_id, seat_type_code, price)
         VALUES (?, ?, ?)
         ON DUPLICATE KEY UPDATE price = VALUES(price)`,
        [showtime_id, seat_type_code, price]
      );
    }

    await conn.commit();
    res.status(200).json({ message: "Cấu hình giá vé theo loại ghế thành công" });
  } catch (err) {
    await conn.rollback();
    console.error("❌ Lỗi setSeatPrices:", err);
    res.status(500).json({ message: "Lỗi server" });
  } finally {
    conn.release();
  }
};

// 4. Lấy sơ đồ ghế + giá của 1 showtime
const getSeatsByShowtime = async (req, res) => {
  const { showtimeId } = req.params;

  try {
    // Lấy location_id từ showtime
    const [[showtime]] = await pool.query(
      `SELECT location_id FROM showtimes WHERE showtime_id = ?`,
      [showtimeId]
    );

    if (!showtime) {
      return res.status(404).json({ message: "Không tìm thấy showtime" });
    }

    // Lấy toàn bộ ghế thuộc location đó
    const [seats] = await pool.query(
      `SELECT s.seat_id, s.seat_row, s.seat_number, s.seat_type_code, st.seat_type_name
       FROM seats s
       JOIN seat_types st ON s.seat_type_code = st.seat_type_code
       WHERE s.location_id = ?
       ORDER BY s.seat_row, s.seat_number`,
      [showtime.location_id]
    );

    // Lấy giá theo seat_type cho showtime
    const [prices] = await pool.query(
      `SELECT seat_type_code, price FROM seat_prices WHERE showtime_id = ?`,
      [showtimeId]
    );
    const priceMap = {};
    for (const p of prices) {
      priceMap[p.seat_type_code] = p.price;
    }

    // Gắn giá vào từng ghế
    const seatMap = seats.map(seat => ({
      ...seat,
      price: priceMap[seat.seat_type_code] || null,
      status: 'available' // tạm mặc định là còn trống
    }));

    res.json({ success: true, seats: seatMap });
  } catch (error) {
    console.error("❌ Lỗi getSeatsByShowtime:", error);
    res.status(500).json({ message: "Lỗi server" });
  }
};

module.exports = {
  createSeatType,
  createSeatsForLocation,
  setSeatPrices,
  getSeatsByShowtime
};
