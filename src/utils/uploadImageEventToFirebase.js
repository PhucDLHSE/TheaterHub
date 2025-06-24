const { bucket } = require("../config/firebase");

/**
 * Upload ảnh mô tả sự kiện (description image) lên Firebase Storage
 * @param {Object} file - File object có các thuộc tính: buffer, mimetype, originalname
 * @param {String} filename - Tên file tùy chỉnh để lưu trữ trong Firebase
 * @returns {String} publicUrl
 */
const uploadImageEventToFirebase = async (file, filename) => {
  try {
    const storagePath = `events_description/${filename}`;
    const fileUpload = bucket.file(storagePath);

    const buffer = Buffer.isBuffer(file.buffer) ? file.buffer : Buffer.from(file.buffer);

    await fileUpload.save(buffer, {
      metadata: { contentType: file.mimetype },
      resumable: false,
    });

    await fileUpload.makePublic();

    const publicUrl = `https://storage.googleapis.com/${bucket.name}/${storagePath}`;
    console.log("✅ Event description image uploaded to Firebase:", publicUrl);
    return publicUrl;
  } catch (err) {
    console.error("❌ Firebase upload error:", err);
    throw new Error("Upload event description image to Firebase failed");
  }
};

module.exports = uploadImageEventToFirebase;
