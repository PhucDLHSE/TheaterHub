const multer = require("multer");

const storage = multer.memoryStorage();

const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
});

const eventUpload = upload.fields([
  { name: "poster", maxCount: 1 },
  { name: "description_images", maxCount: 10 },
]);

const dynamicImageUpload = (req, res, next) => {
  upload.any()(req, res, (err) => {
    if (err) {
      return res.status(400).json({
        success: false,
        message: "Lỗi upload hình ảnh",
        error: err,
      });
    }

    try {
      // Tìm field `updates` trong req.body
      const updatesField = req.body.updates;

      const updates = JSON.parse(updatesField || "[]");

      // Lưu lại updates cho controller dùng
      req.updates = updates;

      // Biến fileList thành object dạng { image_0: File, image_1: File, ... }
      req.imageMap = {};
      for (const file of req.files) {
        req.imageMap[file.fieldname] = file;
      }

      next();
    } catch (error) {
      return res.status(400).json({
        success: false,
        message: "Lỗi khi xử lý updates",
        error,
      });
    }
  });
};


module.exports = {
  upload,        
  eventUpload,   
  dynamicImageUpload
};

