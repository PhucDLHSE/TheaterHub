const express = require("express");
const router = express.Router();
const { upload, eventUpload, dynamicImageUpload } = require("../middlewares/uploadMiddleware");
const {createEvent, getAllEvents, getEventById, updateEvent, updateEventDescriptionPartial, updateEventDescriptionForm} = require("../controllers/eventController");
const { verifyToken, ensureStaff } = require("../middlewares/jwtAuth");

router.post(
  "/",
  verifyToken,         // ✅ luôn để xác thực trước
  ensureStaff,         // ✅ check role
  eventUpload,         // ✅ Chỉ dùng 1 middleware multer
  createEvent
);

router.get(
  "/",
  getAllEvents
);

router.get(
  "/:eventId",
  getEventById        
);

router.patch(
  "/:eventId",
  verifyToken,
  ensureStaff,
  eventUpload,
  updateEvent
);

// //Dùng JSON
// router.patch(
//   "/:eventId/description",
//   verifyToken,
//   ensureStaff,
//   updateEventDescriptionPartial
// );

router.patch(
  "/:eventId/description-form",
  verifyToken,
  ensureStaff,
  dynamicImageUpload, 
  updateEventDescriptionForm
);



module.exports = router;
