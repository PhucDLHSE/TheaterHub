const express = require('express');
const router = express.Router();
const {
    createSeatType, 
    createSeatsForLocation, 
    setSeatPrices,
    getSeatsByShowtime
} = require('../controllers/seatController');
const { verifyToken, ensureStaff } = require('../middlewares/jwtAuth');

// Tạo loại ghế
router.post('/seat-types', verifyToken, ensureStaff, createSeatType);

// Tạo danh sách ghế cho 1 địa điểm
router.post('/locations/seats', verifyToken, ensureStaff, createSeatsForLocation);

// Cấu hình giá vé theo loại ghế cho 1 showtime
router.post('/events/showtimes/seat-prices', verifyToken, ensureStaff, setSeatPrices);

// Lấy sơ đồ ghế theo showtime
router.get('/seats/showtimes/:showtimeId', getSeatsByShowtime)



module.exports = router;
