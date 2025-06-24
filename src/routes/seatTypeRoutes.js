const express = require("express");
const router = express.Router();
const {
  createSeatType,
  getAllSeatTypes,
  getSeatTypeByCode,
  updateSeatType,
  deleteSeatType
} = require("../controllers/seatTypeController");
const { verifyToken, ensureAdmin } = require("../middlewares/jwtAuth");

// GET all seat types (public)
router.get("/", getAllSeatTypes);
// GET by code (public)
router.get("/:seat_type_code", getSeatTypeByCode);
// CREATE (admin only)
router.post("/", verifyToken, ensureAdmin, createSeatType);
// UPDATE (admin only)
router.put("/:seat_type_code", verifyToken, ensureAdmin, updateSeatType);
// DELETE (admin only)
router.delete("/:seat_type_code", verifyToken, ensureAdmin, deleteSeatType);

module.exports = router; 