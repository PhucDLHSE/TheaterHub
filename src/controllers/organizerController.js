const uploadToFirebase = require("../utils/uploadToFirebase");
const pool = require("../config/db");
const db = require("../config/db"); 
const { bucket } = require("../config/firebase");

const createOrganizer = async (req, res) => {
  try {
    const { name, description } = req.body;

    if (!req.file) {
      return res.status(400).json({ error: "Logo file is required" });
    }

    const logoUrl = await uploadToFirebase(req.file);

    const sql = "INSERT INTO organizers (name, logo_url, description) VALUES (?, ?, ?)";
    const [result] = await pool.query(sql, [name, logoUrl, description]);

    res.status(201).json({
      message: "Organizer created successfully",
      organizer_id: result.insertId,
      logo: logoUrl,
    });
  } catch (error) {
    console.error("❌ Error creating organizer:", error);
    res.status(500).json({ error: error.message });
  }
};

const deleteFromFirebase = async (url) => {
  if (!url) return;

  try {
    const decodedUrl = decodeURIComponent(url);
    const baseUrl = `https://storage.googleapis.com/${bucket.name}/`;

    if (!decodedUrl.startsWith(baseUrl)) {
      console.warn("⚠️ URL không đúng định dạng baseUrl:", decodedUrl);
      return;
    }

    const filePath = decodedUrl.slice(baseUrl.length); 
    const file = bucket.file(filePath);

    await file.delete();
    console.log(`✅ Đã xóa file cũ: ${filePath}`);
  } catch (error) {
    console.warn("⚠️ Không thể xóa ảnh cũ:", error.message);
  }
};

const updateOrganizer = async (req, res) => {
  try {
    console.log("👉 Bắt đầu updateOrganizer");

    const { id } = req.params;
    const { name, description } = req.body;

    console.log("📌 Params:", id);
    console.log("📌 Body:", name, description);
    console.log(!!req.file);

   const [rows] = await db.query("SELECT * FROM organizers WHERE organizer_id = ?", [id]);
    if (rows.length === 0) return res.status(404).json({ error: "Organizer not found" });

    let logoUrl = rows[0].logo_url;

    if (req.file) {
      console.log("🧹 Đang xóa ảnh cũ...");
      await deleteFromFirebase(logoUrl);
      console.log("📤 Đang upload ảnh mới...");
      logoUrl = await uploadToFirebase(req.file);
    }

    console.log("💾 Đang cập nhật DB...");
    await db.query(
        "UPDATE organizers SET name = ?, description = ?, logo_url = ? WHERE organizer_id = ?",
        [name, description, logoUrl, id]
    );

    console.log("✅ Update thành công");
    res.json({ message: "Organizer updated successfully", logo: logoUrl });
  } catch (err) {
    console.error("❌ Lỗi trong updateOrganizer:", err);
    res.status(500).json({ error: err.message });
  }
};

// GET /api/organizers
const getAllOrganizers = async (req, res) => {
  try {
    const { search = "", sort = "" } = req.query;

    let sql = "SELECT * FROM organizers";
    const params = [];

    // 🔍 Tìm kiếm theo tên
    if (search) {
      sql += " WHERE name LIKE ?";
      params.push(`%${search}%`);
    }

    // 🔃 Sắp xếp
    if (sort) {
      const [field, direction] = sort.split("_");
      const validFields = ["name", "organizer_id"];
      const validDirections = ["asc", "desc"];

      if (validFields.includes(field) && validDirections.includes(direction.toLowerCase())) {
        sql += ` ORDER BY ${field} ${direction.toUpperCase()}`;
      }
    }

    const [rows] = await db.query(sql, params);
    res.json(rows);
  } catch (err) {
    console.error("❌ Lỗi khi lấy danh sách organizers:", err);
    res.status(500).json({ error: err.message });
  }
};

// GET /api/organizers/:id
const getOrganizerById = async (req, res) => {
  try {
    const { id } = req.params;
    const [rows] = await db.query("SELECT * FROM organizers WHERE organizer_id = ?", [id]);

    if (rows.length === 0) {
      return res.status(404).json({ error: "Organizer not found" });
    }

    res.json(rows[0]);
  } catch (err) {
    console.error("❌ Lỗi khi lấy organizer:", err);
    res.status(500).json({ error: err.message });
  }
};

// DELETE /api/organizers/:id
const deleteOrganizer = async (req, res) => {
  try {
    const { id } = req.params;

    // Kiểm tra organizer tồn tại chưa
    const [rows] = await db.query("SELECT * FROM organizers WHERE organizer_id = ?", [id]);
    if (rows.length === 0) {
      return res.status(404).json({ error: "Organizer not found" });
    }

    const logoUrl = rows[0].logo_url;

    // Xóa ảnh logo khỏi Firebase nếu có
    if (logoUrl) {
      await deleteFromFirebase(logoUrl);
    }

    // Xóa organizer khỏi DB
    await db.query("DELETE FROM organizers WHERE organizer_id = ?", [id]);

    res.json({ message: "Organizer deleted successfully" });
  } catch (err) {
    console.error("❌ Lỗi khi xóa organizer:", err);
    res.status(500).json({ error: err.message });
  }
};

module.exports = { 
    createOrganizer, 
    updateOrganizer,
    getAllOrganizers,
    getOrganizerById,
    deleteOrganizer
};
