const express = require('express');
const router = express.Router();
const { verifyToken } = require('../middlewares/jwtAuth');
const { bookSeatedTickets, bookGeneralTickets, bookZonedTickets, getOrderDetails, cancelOrder } = require('../controllers/bookingController');

// Đặt vé cho sự kiện dạng seated
router.post('/seated', verifyToken, bookSeatedTickets);

// Đặt vé cho sự kiện dạng general (không chọn ghế cụ thể)
router.post('/general', verifyToken, bookGeneralTickets); 

// Đặt vé cho sự kiện dạng zoned (chọn khu vực, không chọn ghế cụ thể)
router.post('/zoned', verifyToken, bookZonedTickets);

// Xem chi tiết đơn
router.get("/orders/:orderId", verifyToken, getOrderDetails);

// Hủy đơn hàng
router.patch('/orders/:orderId/cancel', verifyToken, cancelOrder);

module.exports = router;
