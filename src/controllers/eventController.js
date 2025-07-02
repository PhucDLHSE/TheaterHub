const uploadPosterToFirebase = require("../utils/uploadPosterToFirebase");
const uploadImageToFirebase = require("../utils/uploadImageEventToFirebase");
const pool = require("../config/db"); 
const { v4: uuidv4 } = require("uuid");
const dayjs = require("dayjs");
const utc = require("dayjs/plugin/utc");
const timezone = require("dayjs/plugin/timezone");

dayjs.extend(utc);
dayjs.extend(timezone);

// 1. Tao event
// POST /api/events
const createEvent = async (req, res) => {
  try {
    const { title, event_type, organizer_id, category_id, description: rawDescription } = req.body;

    let posterUrl = null;
    if (req.files["poster"] && req.files["poster"][0]) {
      posterUrl = await uploadPosterToFirebase(req.files["poster"][0]);
    }

    let description = req.body.description;
    if (typeof description === 'string') {
      try {
        description = JSON.parse(description);
      } catch (err) {
        return res.status(400).json({ message: "Mô tả không hợp lệ" });
      }
    }

    const uploadedDescImages = [];
    if (req.files["description_images"]) {
      for (let file of req.files["description_images"]) {
        const ext = file.originalname?.split('.').pop() || 'jpg';
        const filename = `${uuidv4()}.${ext}`;
        const url = await uploadImageToFirebase(file, filename);
        uploadedDescImages.push(url);
      }
    }

    let imageIndex = 0;
    description = description.map((item) => {
      if (item.type === "image" && item.value.startsWith("image_")) {
        item.value = uploadedDescImages[imageIndex++] || "";
      }
      return item;
    });

    const [result] = await pool.query(`
      INSERT INTO events (title, event_type, organizer_id, category_id, poster_url, description)
      VALUES (?, ?, ?, ?, ?, ?)
    `, [title, event_type, organizer_id, category_id, posterUrl, JSON.stringify(description)]);

    return res.status(201).json({
      success: true,
      message: "Tạo sự kiện thành công",
      event: {
        id: result.insertId,
        title,
        event_type,
        organizer_id,
        category_id,
        poster: posterUrl,
        description,
      },
    });
  } catch (error) {
    console.error("❌ Lỗi tạo event:", error);
    return res.status(500).json({ success: false, message: "Lỗi server", error });
  }
};

// 1.2 Xem tất cả event
// GET /api/events
const getAllEvents = async (req, res) => {
  try {
    const [eventRows] = await pool.execute(`
      SELECT 
        e.event_id, e.title, e.poster_url, e.description, e.event_type,
        e.custom_location, e.status, e.created_at,
        o.organizer_id, o.name AS organizer_name, o.logo_url AS organizer_logo, o.description AS organizer_description,
        c.category_id, c.category_name, c.slug AS category_slug
      FROM events e
      LEFT JOIN organizers o ON e.organizer_id = o.organizer_id
      LEFT JOIN event_categories c ON e.category_id = c.category_id
      ORDER BY e.created_at DESC
    `);

    const [showtimeRows] = await pool.execute(`
      SELECT 
        s.showtime_id, s.event_id, s.location_id, s.start_time,
        l.name AS location_name
      FROM showtimes s
      LEFT JOIN locations l ON s.location_id = l.location_id
    `);

    const [ticketRows] = await pool.execute(`
      SELECT 
        ticket_type_id, showtime_id, type_name, price, quantity
      FROM ticket_types
    `);

    const [seatPrices] = await pool.execute(`
      SELECT showtime_id, seat_type_code, price FROM seat_prices
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
      if (!seatPriceMap[sp.showtime_id]) seatPriceMap[sp.showtime_id] = [];
      seatPriceMap[sp.showtime_id].push({
        seat_type_code: sp.seat_type_code,
        price: sp.price
      });
    }

    const showtimeMap = {};
    for (const show of showtimeRows) {
      const showtime = {
        showtime_id: show.showtime_id,
        location_id: show.location_id,
        location_name: show.location_name,
        start_time: dayjs(show.start_time).tz("Asia/Ho_Chi_Minh").format(),
        ticket_types: [],
        seat_prices: []
      };
      if (!showtimeMap[show.event_id]) showtimeMap[show.event_id] = [];
      showtimeMap[show.event_id].push(showtime);
    }

    for (const event of eventRows) {
      const showtimes = showtimeMap[event.event_id] || [];
      for (const showtime of showtimes) {
        if (event.event_type === 'seated') {
          showtime.seat_prices = seatPriceMap[showtime.showtime_id] || [];
        } else {
          showtime.ticket_types = ticketMap[showtime.showtime_id] || [];
        }
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
        description: event.organizer_description,
      },

      category: {
        category_id: event.category_id,
        category_name: event.category_name,
        slug: event.category_slug,
      },

      showtimes: showtimeMap[event.event_id] || [],
    }));

    res.json({ success: true, events });
  } catch (error) {
    console.error("❌ Lỗi khi lấy danh sách sự kiện:", error);
    res.status(500).json({ success: false, message: "Lỗi server." });
  }
};


// 1.3 Xem chi tiết event
// GET /api/events/:eventId
const getEventById = async (req, res) => {
  const { eventId } = req.params;

  try {
    const [rows] = await pool.execute(
      `SELECT 
        e.event_id, e.title, e.description, e.event_type, e.custom_location, e.poster_url AS poster,
        e.organizer_id, o.name AS organizer_name, o.logo_url AS organizer_logo,
        e.category_id, c.category_name AS category_name,
        e.status, e.created_at
      FROM events e
      LEFT JOIN organizers o ON e.organizer_id = o.organizer_id
      LEFT JOIN event_categories c ON e.category_id = c.category_id
      WHERE e.event_id = ?`,
      [eventId]
    );

    if (rows.length === 0) {
      return res.status(404).json({ success: false, message: "Không tìm thấy sự kiện" });
    }

    const row = rows[0];
    let description = [];
    if (typeof row.description === 'string') {
      try {
        description = JSON.parse(row.description);
      } catch {}
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

    const [seats] = await pool.execute(
      `SELECT s.seat_id, s.seat_row, s.seat_number, s.seat_type_code, s.location_id,
              st.seat_type_name
       FROM seats s
       JOIN seat_types st ON s.seat_type_code = st.seat_type_code`
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
      const seatList = row.event_type === 'seated'
        ? seats
            .filter(s => s.location_id === item.location_id)
            .map(s => ({
              seat_id: s.seat_id,
              seat_row: s.seat_row,
              seat_number: s.seat_number,
              seat_type_code: s.seat_type_code,
              seat_type_name: s.seat_type_name,
              price: seatPricesByShowtime[item.showtime_id]?.[s.seat_type_code] || null,
              status: 'available'
            }))
        : [];

      return {
        showtime_id: item.showtime_id,
        location_id: item.location_id,
        location_name: item.location_name,
        start_time: dayjs(item.start_time).tz("Asia/Ho_Chi_Minh").format(),
        ticket_types: row.event_type === 'seated' ? [] : (ticketTypesByShowtime[item.showtime_id] || []),
        seat_prices: row.event_type === 'seated' ? seatPricesByShowtime[item.showtime_id] || [] : [],
        seats: seatList
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
  } catch (error) {
    console.error("❌ Lỗi khi lấy sự kiện:", error);
    return res.status(500).json({ success: false, message: "Lỗi server" });
  }
};

//1.4 Cập nhật event
// PATCH /api/events/:eventId
const updateEvent = async (req, res) => {
  const { eventId } = req.params;

  try {
    // 1. Kiểm tra sự kiện tồn tại
    const [rows] = await pool.execute(
      "SELECT description FROM events WHERE event_id = ?",
      [eventId]
    );
    if (rows.length === 0) {
      return res.status(404).json({ success: false, message: "Sự kiện không tồn tại" });
    }

    // 2. Chuẩn bị mảng cập nhật động
    const fields = [];
    const values = [];

    // 3. Xử lý các trường văn bản
    const textFields = ['title', 'event_type', 'organizer_id', 'category_id'];
    for (const field of textFields) {
      const value = req.body[field];
      if (value !== undefined) {
        if (field === 'organizer_id') {
          const [orgRows] = await pool.execute(
            "SELECT organizer_id FROM organizers WHERE organizer_id = ?",
            [value]
          );
          if (orgRows.length === 0) {
            return res.status(400).json({ success: false, message: "Không tìm thấy đơn vị tổ chức!" });
          }
        }

        if (field === 'category_id') {
          const [catRows] = await pool.execute(
            "SELECT category_id FROM event_categories WHERE category_id = ?",
            [value]
          );
          if (catRows.length === 0) {
            return res.status(400).json({ success: false, message: "Thể loại này không tồn tại!" });
          }
        }

        fields.push(`${field} = ?`);
        values.push(value);
      }
    }

    // 4. Upload poster mới nếu có
    if (req.files?.poster?.[0]) {
      const file = req.files.poster[0];
      const ext = file.originalname.split(".").pop() || "jpg";
      const filename = `poster_${uuidv4()}.${ext}`;
      const fileUrl = await uploadImageToFirebase(file, filename);
      fields.push("poster_url = ?");
      values.push(fileUrl);
    }

    // 5. Cập nhật mô tả (description)
    let mergedDescription = null;
    if (req.body.description !== undefined) {
      let newDescription = [];
      try {
        const parsed = JSON.parse(req.body.description);
        newDescription = Array.isArray(parsed) ? parsed : [parsed];
      } catch (err) {
        return res.status(400).json({ success: false, message: "Mô tả không hợp lệ" });
      }

      // Gắn ảnh vào description (nếu có)
      if (req.files?.description_images) {
        for (let i = 0; i < req.files.description_images.length; i++) {
          const file = req.files.description_images[i];
          const ext = file.originalname.split(".").pop() || "jpg";
          const filename = `desc_${uuidv4()}.${ext}`;
          const fileUrl = await uploadImageToFirebase(file, filename);

          const placeholder = `image_${i}`;
          newDescription = newDescription.map((item) =>
            item.type === "image" && item.value === placeholder
              ? { ...item, value: fileUrl }
              : item
          );
        }
      }

      // Gộp với description cũ
      let oldDescription = [];
      try {
        const parsedOld = JSON.parse(rows[0].description);
        oldDescription = Array.isArray(parsedOld) ? parsedOld : [];
      } catch (err) {
        console.warn("⚠️ Không parse được description cũ:", err);
      }

      mergedDescription = [...oldDescription, ...newDescription];
      fields.push("description = ?");
      values.push(JSON.stringify(mergedDescription));
    }

    // 6. Không có trường nào để cập nhật
    if (fields.length === 0) {
      return res.status(400).json({ success: false, message: "Không có trường nào để cập nhật" });
    }

    // 7. Cập nhật CSDL
    values.push(eventId);
    const sql = `UPDATE events SET ${fields.join(", ")} WHERE event_id = ?`;
    await pool.execute(sql, values);

    // 8. Trả lại thông tin organizer và category nếu có cập nhật
    let organizer = null;
    let category = null;

    if (req.body.organizer_id) {
      const [orgRows] = await pool.execute(
        "SELECT organizer_id, name, logo_url, description FROM organizers WHERE organizer_id = ?",
        [req.body.organizer_id]
      );
      if (orgRows.length > 0) organizer = orgRows[0];
    }

    if (req.body.category_id) {
      const [catRows] = await pool.execute(
        "SELECT category_id, category_name, slug FROM event_categories WHERE category_id = ?",
        [req.body.category_id]
      );
      if (catRows.length > 0) category = catRows[0];
    }

    // 9. Trả kết quả
    res.json({
      success: true,
      message: "Cập nhật sự kiện thành công",
      updatedFields: fields.map(f => f.split(" = ")[0]),
      ...(mergedDescription ? { description: mergedDescription } : {}),
      ...(organizer ? { organizer } : {}),
      ...(category ? { category } : {})
    });

  } catch (error) {
    console.error("❌ Lỗi khi cập nhật sự kiện:", error);
    res.status(500).json({ success: false, message: "Lỗi server" });
  }
};

// 1.5 Cập nhật mô tả sự kiện (cập nhật phần tử cụ thể - text hoặc image)
const updateEventDescriptionForm = async (req, res) => {
  try {
    const { eventId } = req.params;

    const [rows] = await pool.execute("SELECT description FROM events WHERE event_id = ?", [eventId]);
    if (rows.length === 0) {
      return res.status(404).json({ success: false, message: "Không tìm thấy sự kiện" });
    }

    let description;
    try {
      description = typeof rows[0].description === "string"
        ? JSON.parse(rows[0].description)
        : rows[0].description || [];
    } catch (e) {
      description = [];
    }

    for (const { index, type, value } of req.updates || []) {
      if (!description[index]) continue;

      if (type === "text") {
        description[index] = { type: "text", value };
      } else if (type === "image") {
        const file = req.imageMap?.[value];
        if (!file) {
          console.warn("Không tìm thấy ảnh:", value);
          continue;
        }

        const ext = file.originalname?.split('.').pop() || 'jpg';
        const filename = `${uuidv4()}.${ext}`;
        const buffer = Buffer.isBuffer(file.buffer) ? file.buffer : Buffer.from(file.buffer);

        const fileUrl = await uploadImageToFirebase({
          ...file,
          buffer,
        }, filename);

        description[index] = { type: "image", value: fileUrl };
      }
    }

    await pool.execute(
      "UPDATE events SET description = ? WHERE event_id = ?",
      [JSON.stringify(description), eventId]
    );

    return res.json({ success: true, description });
  } catch (error) {
    console.error("Lỗi tại updateEventDescriptionForm:", error);
    return res.status(500).json({
      success: false,
      message: "Lỗi server",
      error: error.message || error,
    });
  }
};

const removeVietnameseTones = (str) => {
  return str
    .normalize("NFD")                      // Tách dấu khỏi chữ cái
    .replace(/[\u0300-\u036f]/g, "")      // Xóa các dấu thanh
    .replace(/đ/g, "d").replace(/Đ/g, "D")// Đổi đ -> d
    .toLowerCase();                       // Chuyển về chữ thường
};

const searchEvents = async (req, res) => {
  try {
    const { name, location, categorySlug } = req.query;

    let sql = `
      SELECT DISTINCT e.*
      FROM events e
      LEFT JOIN showtimes s ON e.event_id = s.event_id
      LEFT JOIN locations l ON s.location_id = l.location_id
      LEFT JOIN event_categories ec ON e.category_id = ec.category_id
      WHERE 1=1
    `;
    const params = [];

    if (name) {
      const normalizedName = removeVietnameseTones(name);
      sql += `
        AND LOWER(
          REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(
            REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(
              e.title,
              'đ','d'),'Đ','D'),'á','a'),'à','a'),'ả','a'),'ã','a'),'ạ','a'),
              'â','a'),'ấ','a'),'ầ','a'),'ậ','a'),'ẫ','a'),'ẩ','a'),
              'ă','a'),'ắ','a'),'ằ','a')
        ) LIKE ?
      `;
      params.push(`%${normalizedName}%`);
    }

    if (location) {
      const normalizedLocation = removeVietnameseTones(location);
      sql += `
        AND (
          LOWER(
            REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(
              REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(
                l.name,
                'đ','d'),'Đ','D'),'á','a'),'à','a'),'ả','a'),'ã','a'),'ạ','a'),
                'â','a'),'ấ','a'),'ầ','a'),'ậ','a'),'ẫ','a'),'ẩ','a'),
                'ă','a'),'ắ','a'),'ằ','a')
          ) LIKE ?
          OR
          LOWER(
            REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(
              REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(
                l.location,
                'đ','d'),'Đ','D'),'á','a'),'à','a'),'ả','a'),'ã','a'),'ạ','a'),
                'â','a'),'ấ','a'),'ầ','a'),'ậ','a'),'ẫ','a'),'ẩ','a'),
                'ă','a'),'ắ','a'),'ằ','a')
          ) LIKE ?
        )
      `;
      params.push(`%${normalizedLocation}%`);
      params.push(`%${normalizedLocation}%`);
    }

    if (categorySlug) {
      sql += ` AND ec.slug = ? `;
      params.push(categorySlug);
    }

    const [rows] = await pool.query(sql, params);
    res.json({ success: true, data: rows });
  } catch (error) {
    console.error("Search error:", error);
    res.status(500).json({ success: false, message: "Search failed" });
  }
};


// //1.4 Nếu hàm 1.5 lỗi, dùng hàm này để cập nhật mô tả sự kiện theo từng phần tử (chỉ text)
// const updateEventDescriptionPartial = async (req, res) => {
//   const eventId = req.params.eventId;
//   const updates = req.body.updates || [];

//   console.log("📥 req.body:", req.body);
//   console.log("📥 updates:", updates);

//   try {
//     const [rows] = await pool.execute(
//       "SELECT description FROM events WHERE event_id = ?",
//       [eventId]
//     );

//     if (!rows.length) {
//       return res.status(404).json({ success: false, message: "Event not found" });
//     }

//     const raw = rows[0].description;
//     let description;
//     try {
//       description = JSON.parse(typeof raw === "string" ? raw : JSON.stringify(raw || []));
//     } catch (err) {
//       return res.status(400).json({ success: false, message: "Invalid description JSON" });
//   }


//     console.log("👉 Description cũ:", description);

//     updates.forEach(({ index, type, value }) => {
//       if (index >= 0 && index < description.length) {
//         console.log("🟡 Updating index", index);
//         description[index] = { type, value };
//       } else {
//         console.warn(`⚠️ Index ${index} is out of bounds`);
//       }
//     });

//     console.log("👉 Description mới:", description);

//     await pool.execute(
//       "UPDATE events SET description = ? WHERE event_id = ?",
//       [JSON.stringify(description), eventId]
//     );

//     res.json({ success: true, message: "Cập nhật thành công", description });
//   } catch (err) {
//     console.error("🔥 Server error:", err);
//     res.status(500).json({ success: false, message: "Server error" });
//   }
// };

module.exports = { 
  createEvent,
  getAllEvents,
  getEventById,
  updateEvent,
  // updateEventDescriptionPartial,
  updateEventDescriptionForm,
  searchEvents
};
