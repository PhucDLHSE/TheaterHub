const express = require('express');
const router = express.Router();
const jwtAuth = require('../middleware/jwtAuth');
const userController = require('../controllers/userController');

// Cập nhật số điện thoại người dùng đang đăng nhập
router.put('/me/phone', jwtAuth, userController.updatePhone);

module.exports = router;
