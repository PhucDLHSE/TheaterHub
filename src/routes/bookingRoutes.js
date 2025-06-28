const express = require('express');
const router = express.Router();
const { verifyToken } = require('../middlewares/jwtAuth');
const { bookSeatedTickets, getOrderDetails, cancelOrder } = require('../controllers/bookingController');

// Đặt vé cho sự kiện dạng seated
router.post('/seated', verifyToken, bookSeatedTickets);

// Xem chi tiết đơn
router.get("/orders/:orderId", verifyToken, getOrderDetails);

// Hủy đơn hàng
router.patch('/orders/:orderId/cancel', verifyToken, cancelOrder);

module.exports = router;
