const express = require("express");
const router = express.Router();
const {
  createShowtime,
  getAllShowtimes,
  getShowtimeById,
  updateShowtime,
  deleteShowtime
} = require("../controllers/showtimeController");
const { verifyToken, ensureStaff } = require("../middlewares/jwtAuth");

// GET all showtimes (public)
router.get("/", getAllShowtimes);
// GET showtime by id (public)
router.get("/:showtime_id", getShowtimeById);
// CREATE showtime (staff only)
router.post("/", verifyToken, ensureStaff, createShowtime);
// UPDATE showtime (staff only)
router.put("/:showtime_id", verifyToken, ensureStaff, updateShowtime);
// DELETE showtime (staff only)
router.delete("/:showtime_id", verifyToken, ensureStaff, deleteShowtime);

module.exports = router; 