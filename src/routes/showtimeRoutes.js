const express = require('express');
const router = express.Router();
const multer = require('multer');
const upload = multer();
const { verifyToken, ensureStaff, ensureAdmin } = require('../middlewares/jwtAuth');
const {
    createShowtime, 
    getShowtimesByEvent, 
    getShowtimeById, 
    updateShowtime, 
    deleteShowtime,
    getShowtimeSeatsWithPrice
    } = require('../controllers/showtimeController');

// Tạo showtime cho sự kiện (Payload 2)
router.post('/events/:eventId/showtimes', verifyToken, ensureStaff, createShowtime);

// Lấy tất cả showtime của 1 sự kiện
router.get('/events/:eventId/showtimes', verifyToken, ensureStaff, getShowtimesByEvent);

// Lấy chi tiết 1 showtime theo ID
router.get('/showtimes/:showtimeId', verifyToken, ensureStaff, getShowtimeById);

// Cập nhật 1 showtime theo ID
router.patch('/showtimes/:showtimeId', verifyToken, ensureStaff, upload.none(), updateShowtime);

// Xóa 1 showtime theo ID
router.delete('/showtimes/:showtimeId', verifyToken, ensureStaff, deleteShowtime);

// Lấy danh sách ghế và giá vé của showtime
router.get("/showtimes/:showtimeId/seats", verifyToken, ensureStaff, getShowtimeSeatsWithPrice);

module.exports = router;
