const express = require('express');
const router = express.Router();
const { getPurchasedTickets, getTicketOrderDetail } = require('../controllers/ticketController');
const { verifyToken } = require('../middlewares/jwtAuth');

router.get('/my-tickets', verifyToken, getPurchasedTickets);

router.get('/my-tickets/:orderId', verifyToken, getTicketOrderDetail);

module.exports = router;
