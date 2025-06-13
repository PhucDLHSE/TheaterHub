const express = require('express');
const router = express.Router();
const {
  createEventCategory,
 getEventCategoryById,
  getAllEventCategories,
  updateEventCategory,
  deleteEventCategory
} = require('../controllers/eventCategoryController');

const { verifyToken, ensureStaff } = require('../middlewares/jwtAuth');

router.get('/', getAllEventCategories);
router.get('/:category_id', getEventCategoryById);
router.post('/', verifyToken, ensureStaff, createEventCategory);
router.patch('/:category_id', verifyToken, ensureStaff, updateEventCategory);
router.delete('/:category_id', verifyToken, ensureStaff, deleteEventCategory);

module.exports = router;
