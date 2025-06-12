const { bucket } = require("../config/firebase");

const uploadToFirebase = async (file) => {
  try {
    const filename = `organizers/${Date.now()}-${file.originalname}`;
    const fileUpload = bucket.file(filename);

    await fileUpload.save(file.buffer, {
      metadata: { contentType: file.mimetype },
      resumable: false,
    });

    // Nếu bucket cho phép public:
    await fileUpload.makePublic();

    const publicUrl = `https://storage.googleapis.com/${bucket.name}/${filename}`;
    console.log("✅ File uploaded to Firebase:", publicUrl);
    return publicUrl;
  } catch (err) {
    console.error("❌ Firebase upload error:", err);
    throw new Error("Upload to Firebase failed");
  }
};

module.exports = uploadToFirebase;
