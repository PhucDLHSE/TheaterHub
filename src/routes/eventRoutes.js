const express = require("express");
const router = express.Router();
const { upload, eventUpload, dynamicImageUpload } = require("../middlewares/uploadMiddleware");
const { verifyToken, ensureStaff, ensureAdmin } = require("../middlewares/jwtAuth");
const {
  createEvent, 
  getAllEvents, 
  getEventById, 
  updateEvent, 
  // updateEventDescriptionPartial, 
  updateEventDescriptionForm,
  searchEvents
} = require("../controllers/eventController");
const { updateEventStatus } = require("../controllers/eventStatusController");

// Route tìm kiếm sự kiện với các bộ lọc linh hoạt
router.get("/search", searchEvents);

// 1. Tạo sự kiện
router.post("/", verifyToken, ensureStaff, eventUpload, createEvent);

//`2. Lấy danh sách sự kiện
router.get("/", verifyToken, ensureStaff, getAllEvents);



// 3. Lấy chi tiết sự kiện theo ID
router.get("/:eventId", verifyToken, ensureStaff, getEventById);

// 4. Cập nhật sự kiện
router.patch("/:eventId", verifyToken, ensureStaff, eventUpload, updateEvent);

// //4. Cập nhật sự kiện Dùng JSON 
// router.patch("/:eventId/description", verifyToken, ensureStaff, updateEventDescriptionPartial);

// 5. Cập nhật mô tả sự kiện bằng form
router.patch("/:eventId/description-form", verifyToken, ensureStaff, dynamicImageUpload, updateEventDescriptionForm);

// 6. Cập nhật trạng thái sự kiện
router.patch('/:eventId/status', verifyToken, upload.none(), updateEventStatus);


module.exports = router;
