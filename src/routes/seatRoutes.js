const express = require("express");
const router = express.Router();
const {
  createSeat,
  getAllSeats,
  getSeatById,
  updateSeat,
  deleteSeat
} = require("../controllers/seatController");
const { verifyToken, ensureAdmin, ensureStaff } = require("../middlewares/jwtAuth");

// GET all seats (public)
router.get("/", getAllSeats);
// GET seat by id (public)
router.get("/:seat_id", getSeatById);
// CREATE seat (staff only)
router.post("/", verifyToken, ensureStaff, createSeat);
// UPDATE seat (staff only)
router.put("/:seat_id", verifyToken, ensureStaff, updateSeat);
// DELETE seat (staff only)
router.delete("/:seat_id", verifyToken, ensureStaff, deleteSeat);

module.exports = router; 