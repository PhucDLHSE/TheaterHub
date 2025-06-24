const express = require("express");
const router = express.Router();
const {
  createTicketType,
  getAllTicketTypes,
  getTicketTypeById,
  updateTicketType,
  deleteTicketType
} = require("../controllers/ticketTypeController");
const { verifyToken, ensureStaff } = require("../middlewares/jwtAuth");

// GET all ticket types (public)
router.get("/", getAllTicketTypes);
// GET ticket type by id (public)
router.get("/:ticket_type_id", getTicketTypeById);
// CREATE ticket type (staff only)
router.post("/", verifyToken, ensureStaff, createTicketType);
// UPDATE ticket type (staff only)
router.put("/:ticket_type_id", verifyToken, ensureStaff, updateTicketType);
// DELETE ticket type (staff only)
router.delete("/:ticket_type_id", verifyToken, ensureStaff, deleteTicketType);

module.exports = router; 