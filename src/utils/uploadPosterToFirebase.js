const { bucket } = require("../config/firebase");

const uploadPosterToFirebase = async (file) => {
  try {
    const filename = `events_poster/${Date.now()}-${file.originalname}`;
    const fileUpload = bucket.file(filename);

    await fileUpload.save(file.buffer, {
      metadata: { contentType: file.mimetype },
      resumable: false,
    });

    await fileUpload.makePublic();

    const publicUrl = `https://storage.googleapis.com/${bucket.name}/${filename}`;
    console.log("✅ Event poster uploaded to Firebase:", publicUrl);
    return publicUrl;
  } catch (err) {
    console.error("❌ Firebase upload error:", err);
    throw new Error("Upload event poster to Firebase failed");
  }
};

module.exports = uploadPosterToFirebase;
