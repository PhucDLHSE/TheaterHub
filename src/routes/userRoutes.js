const express = require('express');
const router = express.Router();
const { verifyToken, ensureAdmin, ensureOwner } = require('../middlewares/jwtAuth');
const userController = require('../controllers/userController');

router.get('/', verifyToken, ensureAdmin, userController.getAllUsers);
router.get('/search', verifyToken, ensureAdmin, userController.searchUsers);
router.get('/me', verifyToken, userController.getCurrentUser);
router.get('/:id', verifyToken, ensureAdmin, userController.getUserById);

router.put('/:id', verifyToken, ensureOwner(), userController.updateUser);
router.patch('/update-profile', verifyToken, userController.updateProfile);
// router.delete('/:id', verifyToken, ensureAdmin, userController.deleteUser);

// 🔒 Bổ sung các API bảo mật
router.patch('/change-password', verifyToken, userController.changePassword);
router.post('/forgot-password', userController.forgotPassword);
router.post('/reset-password', userController.resetPassword);
router.patch('/:id/lock', verifyToken, ensureAdmin, userController.lockUser);

router.patch('/role/:id', verifyToken, ensureAdmin, userController.updateUserRole);


module.exports = router;
