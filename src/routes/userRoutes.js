const express = require('express');
const router = express.Router();
const { verifyToken, ensureAdmin, ensureOwner } = require('../middlewares/jwtAuth');
const userController = require('../controllers/userController');

// Cập nhật số điện thoại người dùng đang đăng nhập
// router.put('/me/phone', verifyToken, userController.updatePhone);

// Lấy danh sách tất cả người dùng (admin)
router.get('/', verifyToken, ensureAdmin, userController.getAllUsers);

// Tìm kiếm người dùng (admin)
router.get('/search', verifyToken, ensureAdmin, userController.searchUsers);

// Lấy thông tin người dùng theo ID {admin}
router.get('/:id', verifyToken, ensureAdmin, userController.getUserById);

// Cập nhật thông tin người dùng (chính chủ hoặc admin)
router.put('/:id', verifyToken, ensureOwner(), userController.updateUser);

// Cập nhật số điện thoại người dùng (chính chủ)
router.patch('/update-phone', verifyToken, userController.updatePhone);

// Xóa người dùng (admin)
router.delete('/:id', verifyToken, ensureAdmin, userController.deleteUser);


module.exports = router;
