const express = require("express");
const router = express.Router();
const {
  createRoom,
  getAllRooms,
  getRoomById,
  getRoomsByTheater,
  updateRoom,
  deleteRoom
} = require("../controllers/roomController");
const { verifyToken, ensureStaff } = require("../middlewares/jwtAuth");

// GET - Lấy danh sách tất cả phòng (public)
router.get("/", getAllRooms);

// GET - Lấy phòng theo theater_id (public) - PHẢI ĐẶT TRƯỚC /:room_id
router.get("/theater/:theater_id", getRoomsByTheater);

// GET - Lấy phòng theo ID (public)
router.get("/:room_id", getRoomById);

// POST - Tạo phòng mới (staff only)
router.post(
  "/",
  verifyToken,
  ensureStaff,
  createRoom
);

// PUT - Cập nhật phòng (staff only)
router.put(
  "/:room_id",
  verifyToken,
  ensureStaff,
  updateRoom
);

// DELETE - Xóa phòng (staff only)
router.delete(
  "/:room_id",
  verifyToken,
  ensureStaff,
  deleteRoom
);

module.exports = router; 