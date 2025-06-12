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



module.exports = { 
    createOrganizer, 
    updateOrganizer
};
