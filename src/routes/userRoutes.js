const express = require('express');
const router = express.Router();
const { verifyToken } = require('../middlewares/jwtAuth');
const userController = require('../controllers/userController');

// Cập nhật số điện thoại người dùng đang đăng nhập
router.put('/me/phone', verifyToken, userController.updatePhone);

module.exports = router;
