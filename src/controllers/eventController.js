const uploadPosterToFirebase = require("../utils/uploadPosterToFirebase");
const pool = require("../config/db"); 

const createEvent = async (req, res) => {
  try {
    const {
      title,
      event_type,
      organizer_id,
      category_id,
      description: rawDescription,
    } = req.body;

    let posterUrl = null;
    if (req.files["poster"] && req.files["poster"][0]) {
      posterUrl = await uploadPosterToFirebase(req.files["poster"][0]);
    }

    let description = [];
    try {
      description = JSON.parse(rawDescription || "[]");
    } catch (err) {
      return res.status(400).json({ success: false, message: "Mô tả không hợp lệ" });
    }

    const uploadedDescImages = [];
    if (req.files["description_images"]) {
      for (let file of req.files["description_images"]) {
        const url = await uploadPosterToFirebase(file);
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

const getAllEvents = async (req, res) => {
  try {
    const [events] = await pool.query(`
      SELECT event_id, title, event_type, organizer_id, category_id, poster_url, description, custom_location, status, created_at
      FROM events
      ORDER BY created_at DESC
    `);
    return res.status(200).json({ success: true, events });
  } catch (error) {
    return res.status(500).json({ success: false, message: "Lỗi server", error });
  }
};

module.exports = { createEvent, getAllEvents };
