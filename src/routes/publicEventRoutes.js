const express = require("express");
const router = express.Router();
const {
  getAllPublicEvents,
  getPublicEventById,
  getPublicShowtimeSeats
} = require("../controllers/publicEventController");

router.get("/events", getAllPublicEvents);
router.get("/events/:eventId", getPublicEventById);

router.get('/showtimes/:showtimeId/seats', getPublicShowtimeSeats);


module.exports = router;
