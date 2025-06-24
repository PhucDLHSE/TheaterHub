const express = require("express");
const router = express.Router();
const {
  createTheater,
  getAllTheaters,
  getTheaterById,
  updateTheater,
  deleteTheater
} = require("../controllers/theaterController");
const { verifyToken, ensureStaff } = require("../middlewares/jwtAuth");

// GET - Lấy danh sách tất cả rạp (public)
router.get("/", getAllTheaters);

// GET - Lấy rạp theo ID (public)
router.get("/:theater_id", getTheaterById);

// POST - Tạo rạp mới (staff only)
router.post(
  "/",
  verifyToken,
  ensureStaff,
  createTheater
);

// PUT - Cập nhật rạp (staff only)
router.put(
  "/:theater_id",
  verifyToken,
  ensureStaff,
  updateTheater
);

// DELETE - Xóa rạp (staff only)
router.delete(
  "/:theater_id",
  verifyToken,
  ensureStaff,
  deleteTheater
);

module.exports = router; 