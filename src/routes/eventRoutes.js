const express = require("express");
const router = express.Router();
const { upload, eventUpload } = require("../middlewares/uploadMiddleware");
const {createEvent} = require("../controllers/eventController");
const { verifyToken, ensureStaff } = require("../middlewares/jwtAuth");

router.post(
  "/",
  verifyToken,         // ✅ luôn để xác thực trước
  ensureStaff,         // ✅ check role
  eventUpload,         // ✅ Chỉ dùng 1 middleware multer
  createEvent
);


module.exports = router;
