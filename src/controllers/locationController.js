const pool = require("../config/db"); 

// CREATE
const createLocation = async (req, res) => {
  const { name, location, description, map_url } = req.body;

  try {
    const [result] = await pool.execute(
      `INSERT INTO locations (name, location, description, map_url)
       VALUES (?, ?, ?, ?)`,
      [name, location, description, map_url]
    );

    const newLocationId = result.insertId;

    const [rows] = await pool.execute(
      `SELECT * FROM locations WHERE location_id = ?`,
      [newLocationId]
    );

    res.json({
      success: true,
      message: "Đã tạo địa điểm thành công",
      location: rows[0]
    });
  } catch (error) {
    console.error("❌ Lỗi khi tạo địa điểm:", error);
    res.status(500).json({ success: false, message: "Lỗi server." });
  }
};


// GET ALL
const getAllLocations = async (req, res) => {
  try {
    const [rows] = await pool.execute(`SELECT * FROM locations ORDER BY location_id DESC`);
    res.json({ success: true, locations: rows });
  } catch (error) {
    console.error("❌ Lỗi khi lấy danh sách địa điểm:", error);
    res.status(500).json({ success: false, message: "Lỗi server" });
  }
};

// GET BY ID
const getLocationById = async (req, res) => {
  const { id } = req.params;
  try {
    const [rows] = await pool.execute(`SELECT * FROM locations WHERE location_id = ?`, [id]);
    if (rows.length === 0) {
      return res.status(404).json({ success: false, message: "Không tìm thấy địa điểm" });
    }
    res.json({ success: true, location: rows[0] });
  } catch (error) {
    console.error("❌ Lỗi khi lấy địa điểm:", error);
    res.status(500).json({ success: false, message: "Lỗi server" });
  }
};

// UPDATE
const updateLocation = async (req, res) => {
  const { id } = req.params;
  const { name, location, description, map_url } = req.body;

  try {
    const [check] = await pool.execute(
      `SELECT * FROM locations WHERE location_id = ?`,
      [id]
    );

    if (check.length === 0) {
      return res.status(404).json({ success: false, message: "Không tìm thấy địa điểm." });
    }

    const fields = [];
    const values = [];

    if (name !== undefined) {
      fields.push("name = ?");
      values.push(name);
    }
    if (location !== undefined) {
      fields.push("location = ?");
      values.push(location);
    }
    if (description !== undefined) {
      fields.push("description = ?");
      values.push(description);
    }
    if (map_url !== undefined) {
      fields.push("map_url = ?");
      values.push(map_url);
    }

    if (fields.length === 0) {
      return res.status(400).json({ success: false, message: "Không có dữ liệu nào để cập nhật." });
    }

    values.push(id); 

    const query = `UPDATE locations SET ${fields.join(", ")} WHERE location_id = ?`;

    await pool.execute(query, values);

    const [updated] = await pool.execute(
      `SELECT * FROM locations WHERE location_id = ?`,
      [id]
    );

    res.json({
      success: true,
      message: "Cập nhật địa điểm thành công",
      location: updated[0]
    });
  } catch (error) {
    console.error("❌ Lỗi khi cập nhật địa điểm:", error);
    res.status(500).json({ success: false, message: "Lỗi server." });
  }
};


// DELETE
const deleteLocation = async (req, res) => {
  const { id } = req.params;
  try {
    const [result] = await pool.execute(`DELETE FROM locations WHERE location_id = ?`, [id]);
    if (result.affectedRows === 0) {
      return res.status(404).json({ success: false, message: "Không tìm thấy địa điểm để xoá" });
    }
    res.json({ success: true, message: "Xoá địa điểm thành công" });
  } catch (error) {
    console.error("❌ Lỗi khi xoá địa điểm:", error);
    res.status(500).json({ success: false, message: "Lỗi server" });
  }
};

module.exports = {
  createLocation,
  getAllLocations,
  getLocationById,
  updateLocation,
  deleteLocation
};

