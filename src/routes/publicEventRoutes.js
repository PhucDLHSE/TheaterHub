const express = require("express");
const router = express.Router();
const {
  getAllPublicEvents,
  getPublicEventById,
  getPublicSeatsByShowtime, 
  getGeneralTicketTypes, 
  getZonedTicketTypes
} = require("../controllers/publicEventController");

router.get("/events", getAllPublicEvents);
router.get("/events/:eventId", getPublicEventById);

router.get('/showtimes/:showtimeId/seats', getPublicSeatsByShowtime);
router.get('/events/:eventId/general-ticket-types', getGeneralTicketTypes);
router.get('/events/:eventId/zoned-ticket-types', getZonedTicketTypes);


module.exports = router;
