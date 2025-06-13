const multer = require("multer");

const storage = multer.memoryStorage();

const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
});

// 👉 Hàm upload cho event có nhiều field file (poster, description_images)
const eventUpload = upload.fields([
  { name: "poster", maxCount: 1 },
  { name: "description_images", maxCount: 10 },
]);


module.exports = {
  upload,        // Dùng cho các trường hợp đơn giản
  eventUpload,   // Dùng cho /api/events (upload poster + ảnh mô tả)
};

