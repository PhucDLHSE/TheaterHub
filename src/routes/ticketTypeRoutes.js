const express = require("express");
const router = express.Router();
const {
  createTicketType,
  getTicketTypesByEvent,
  updateTicketType,
  deleteTicketType
} = require("../controllers/ticketTypeController");

const { verifyToken, ensureStaff } = require("../middlewares/jwtAuth");

// POST: Tạo danh sách ticket types cho 1 showtime
router.post("/events/:eventId/ticket-types/:showtimeId", verifyToken, ensureStaff, createTicketType);

// GET: Lấy ticket types theo event_id
router.get("/:eventId/ticket-types", getTicketTypesByEvent);

// PATCH: Cập nhật 1 ticket_type
router.patch("/:eventId/ticket-types/:ticketTypeId", verifyToken, ensureStaff, updateTicketType);

// DELETE: Xoá 1 ticket_type
router.delete("/:eventId/ticket-types/:ticketTypeId", verifyToken, ensureStaff, deleteTicketType);


module.exports = router;
