const pool = require("../config/db");
const dayjs = require("dayjs");
require("dayjs/locale/vi");
const utc = require("dayjs/plugin/utc");
const timezone = require("dayjs/plugin/timezone");
dayjs.extend(utc);
dayjs.extend(timezone);

// 1. Lấy danh sách tất cả sự kiện đang được bán vé
const getAllPublicEvents = async (req, res) => {
  try {
    const [eventRows] = await pool.execute(`
      SELECT 
        e.event_id, e.title, e.poster_url, e.description, e.event_type,
        e.custom_location, e.status, e.created_at,
        o.organizer_id, o.name AS organizer_name, o.logo_url AS organizer_logo,
        c.category_id, c.category_name
      FROM events e
      LEFT JOIN organizers o ON e.organizer_id = o.organizer_id
      LEFT JOIN event_categories c ON e.category_id = c.category_id
      WHERE e.status = 'upcoming'
      ORDER BY e.created_at DESC
    `);

    const [showtimeRows] = await pool.execute(`
      SELECT s.showtime_id, s.event_id, s.location_id, s.start_time, l.name AS location_name
      FROM showtimes s
      LEFT JOIN locations l ON s.location_id = l.location_id
    `);

    const [ticketRows] = await pool.execute(`
      SELECT ticket_type_id, showtime_id, type_name, price, quantity
      FROM ticket_types
    `);

    const [seatPrices] = await pool.execute(`
      SELECT showtime_id, seat_type_code, price FROM seat_prices
    `);

    const [seats] = await pool.execute(`
      SELECT s.seat_id, s.seat_row, s.seat_number, s.seat_type_code, s.location_id,
             st.seat_type_name
      FROM seats s
      JOIN seat_types st ON s.seat_type_code = st.seat_type_code
    `);

    const ticketMap = {};
    for (const ticket of ticketRows) {
      if (!ticketMap[ticket.showtime_id]) ticketMap[ticket.showtime_id] = [];
      ticketMap[ticket.showtime_id].push({
        ticket_type_id: ticket.ticket_type_id,
        type_name: ticket.type_name,
        price: ticket.price,
        quantity: ticket.quantity,
      });
    }

    const seatPriceMap = {};
    for (const sp of seatPrices) {
      if (!seatPriceMap[sp.showtime_id]) seatPriceMap[sp.showtime_id] = {};
      seatPriceMap[sp.showtime_id][sp.seat_type_code] = sp.price;
    }

    const showtimeMap = {};
    for (const show of showtimeRows) {
      const showtime = {
        showtime_id: show.showtime_id,
        location_id: show.location_id,
        location_name: show.location_name,
        start_time: dayjs(show.start_time).tz("Asia/Ho_Chi_Minh").format(),
        ticket_types: [],
        seat_prices: [],
        seats: []
      };
      if (!showtimeMap[show.event_id]) showtimeMap[show.event_id] = [];
      showtimeMap[show.event_id].push(showtime);
    }

    for (const event of eventRows) {
      const showtimes = showtimeMap[event.event_id] || [];
      for (const showtime of showtimes) {
        if (event.event_type === 'seated') {
          showtime.seat_prices = Object.entries(seatPriceMap[showtime.showtime_id] || {}).map(([type, price]) => ({
            seat_type_code: type,
            price
          }));
        } else {
          showtime.ticket_types = ticketMap[showtime.showtime_id] || [];
        }
        delete showtime.seats; // bỏ ghế ở đây
      }
    }

    const events = eventRows.map(event => ({
      event_id: event.event_id,
      title: event.title,
      poster_url: event.poster_url,
      event_type: event.event_type,
      custom_location: event.custom_location,
      status: event.status,
      created_at: event.created_at,
      description: typeof event.description === 'string'
        ? (() => { try { return JSON.parse(event.description || '[]'); } catch { return []; } })()
        : event.description || [],
      organizer: {
        organizer_id: event.organizer_id,
        name: event.organizer_name,
        logo_url: event.organizer_logo,
      },
      category: {
        category_id: event.category_id,
        category_name: event.category_name
      },
      showtimes: showtimeMap[event.event_id] || []
    }));

    res.json({ success: true, events });
  } catch (err) {
    console.error("❌ Lỗi getAllPublicEvents:", err);
    res.status(500).json({ success: false, message: "Lỗi server" });
  }
};

// 2. Xem thông tin chi tiết sự kiện đang được bán vé
const getPublicEventById = async (req, res) => {
  const { eventId } = req.params;

  try {
    const [rows] = await pool.execute(
      `SELECT 
        e.event_id, e.title, e.description, e.event_type, e.custom_location, e.poster_url AS poster,
        e.organizer_id, o.name AS organizer_name, o.logo_url AS organizer_logo,
        e.category_id, c.category_name,
        e.status, e.created_at
      FROM events e
      LEFT JOIN organizers o ON e.organizer_id = o.organizer_id
      LEFT JOIN event_categories c ON e.category_id = c.category_id
      WHERE e.event_id = ? AND e.status = 'upcoming'`,
      [eventId]
    );

    if (rows.length === 0) {
      return res.status(404).json({ success: false, message: "Không tìm thấy sự kiện hoặc sự kiện chưa được duyệt" });
    }

    const row = rows[0];
    let description = [];
    if (typeof row.description === 'string') {
      try { description = JSON.parse(row.description); } catch {}
    } else if (typeof row.description === 'object' && row.description !== null) {
      description = row.description;
    }

    const [showtimeRows] = await pool.execute(
      `SELECT s.showtime_id, s.location_id, l.name AS location_name, s.start_time
       FROM showtimes s
       LEFT JOIN locations l ON s.location_id = l.location_id
       WHERE s.event_id = ?
       ORDER BY s.start_time ASC`,
      [eventId]
    );

    const [ticketTypeRows] = await pool.execute(
      `SELECT tt.ticket_type_id, tt.showtime_id, tt.type_name, tt.price, tt.quantity
       FROM ticket_types tt
       JOIN showtimes s ON tt.showtime_id = s.showtime_id
       WHERE s.event_id = ?`,
      [eventId]
    );

    const [seatPrices] = await pool.execute(
      `SELECT showtime_id, seat_type_code, price FROM seat_prices
       WHERE showtime_id IN (${showtimeRows.map(s => s.showtime_id).join(',') || 0})`
    );

    const ticketTypesByShowtime = {};
    for (const row of ticketTypeRows) {
      if (!ticketTypesByShowtime[row.showtime_id]) {
        ticketTypesByShowtime[row.showtime_id] = [];
      }
      ticketTypesByShowtime[row.showtime_id].push({
        ticket_type_id: row.ticket_type_id,
        type_name: row.type_name,
        price: row.price,
        quantity: row.quantity
      });
    }

    const seatPricesByShowtime = {};
    for (const sp of seatPrices) {
      if (!seatPricesByShowtime[sp.showtime_id]) seatPricesByShowtime[sp.showtime_id] = {};
      seatPricesByShowtime[sp.showtime_id][sp.seat_type_code] = sp.price;
    }

    const showtimes = showtimeRows.map(item => {
      return {
        showtime_id: item.showtime_id,
        location_id: item.location_id,
        location_name: item.location_name,
        start_time: dayjs(item.start_time).tz("Asia/Ho_Chi_Minh").format(),
        ticket_types: row.event_type === 'seated' ? [] : (ticketTypesByShowtime[item.showtime_id] || []),
        seat_prices: row.event_type === 'seated' ? seatPricesByShowtime[item.showtime_id] || [] : [],
      };
    });

    const event = {
      event_id: row.event_id,
      title: row.title,
      poster_url: row.poster,
      description,
      event_type: row.event_type,
      status: row.status,
      custom_location: row.custom_location,
      created_at: row.created_at,
      organizer: {
        organizer_id: row.organizer_id,
        name: row.organizer_name,
        logo_url: row.organizer_logo
      },
      category: {
        category_id: row.category_id,
        category_name: row.category_name
      },
      showtimes
    };

    return res.status(200).json({ success: true, event });
  } catch (err) {
    console.error("❌ Lỗi getPublicEventById:", err);
    return res.status(500).json({ success: false, message: "Lỗi server" });
  }
};

// 3. Lấy sơ đồ ghế của suất chiếu công khai
// Chỉ áp dụng cho sự kiện có loại 'seated'
const getPublicSeatsByShowtime = async (req, res) => {
  const { showtimeId } = req.params;

  try {
    // 1. Lấy thông tin showtime + event
    const [[showtime]] = await pool.query(
      `SELECT s.location_id, e.event_type 
       FROM showtimes s
       JOIN events e ON s.event_id = e.event_id
       WHERE s.showtime_id = ? AND e.status = 'upcoming'`,
      [showtimeId]
    );

    if (!showtime || showtime.event_type !== 'seated') {
      return res.status(404).json({ message: "Không tìm thấy showtime hoặc không phải dạng chọn ghế" });
    }

    // 2. Ghế đã RESERVED (chưa thanh toán và chưa hết hạn)
    const [reservedSeats] = await pool.query(
      `SELECT seat_id FROM tickets
       WHERE showtime_id = ?
         AND status = 'reserved'
         AND order_id IN (
           SELECT order_id FROM ticket_orders
           WHERE status = 'reserved' AND expires_at > NOW()
         )`,
      [showtimeId]
    );
    const reservedSeatIds = reservedSeats.map(r => r.seat_id);

    // 3. Ghế đã PAID
    const [paidSeats] = await pool.query(
      `SELECT seat_id FROM tickets
       WHERE showtime_id = ? AND status = 'paid'`,
      [showtimeId]
    );
    const paidSeatIds = paidSeats.map(r => r.seat_id);

    // 4. Lấy toàn bộ ghế trong location
    const [seats] = await pool.query(
      `SELECT s.seat_id, s.seat_row, s.seat_number, s.seat_type_code, st.seat_type_name
       FROM seats s
       JOIN seat_types st ON s.seat_type_code = st.seat_type_code
       WHERE s.location_id = ?
       ORDER BY s.seat_row, s.seat_number`,
      [showtime.location_id]
    );

    // 5. Lấy giá từng loại ghế
    const [prices] = await pool.query(
      `SELECT seat_type_code, price FROM seat_prices WHERE showtime_id = ?`,
      [showtimeId]
    );
    const priceMap = {};
    for (const p of prices) {
      priceMap[p.seat_type_code] = p.price;
    }

    // 6. Gộp thông tin ghế
    const seatMap = seats.map(seat => ({
      ...seat,
      price: priceMap[seat.seat_type_code] || null,
      status: paidSeatIds.includes(seat.seat_id)
        ? 'paid'
        : reservedSeatIds.includes(seat.seat_id)
          ? 'reserved'
          : 'available'
    }));

    res.json({ success: true, seats: seatMap });
  } catch (err) {
    console.error("❌ Lỗi getPublicSeatsByShowtime:", err);
    res.status(500).json({ success: false, message: "Lỗi server" });
  }
};

module.exports = {
  getAllPublicEvents,
  getPublicEventById,
  getPublicSeatsByShowtime
};
