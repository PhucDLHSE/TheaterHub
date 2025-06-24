const express = require("express");
const router = express.Router();
const {
  createTicket,
  getAllTickets,
  getTicketById,
  updateTicket,
  deleteTicket
} = require("../controllers/ticketController");

// GET all tickets (public)
router.get("/", getAllTickets);
// GET ticket by id (public)
router.get("/:ticket_id", getTicketById);
// CREATE ticket (public)
router.post("/", createTicket);
// UPDATE ticket (public)
router.put("/:ticket_id", updateTicket);
// DELETE ticket (public)
router.delete("/:ticket_id", deleteTicket);

module.exports = router; 