const { getBucket } = require("../config/firebase");

const uploadToFirebase = async (file) => {
  try {
    console.log("🔄 Starting Firebase upload...");
    
    // Get bucket (ensures initialization)
    const bucket = await getBucket();
    
    if (!bucket) {
      throw new Error("Firebase bucket not available");
    }
    
    console.log("🪣 Bucket ready:", bucket.name);
    
    // Validate file
    if (!file || !file.buffer) {
      throw new Error("Invalid file object");
    }

    const filename = `organizers/${Date.now()}-${file.originalname}`;
    console.log("📝 Filename:", filename);
    
    const fileUpload = bucket.file(filename);

    // Upload file
    console.log("⬆️ Uploading file...");
    await fileUpload.save(file.buffer, {
      metadata: { 
        contentType: file.mimetype,
        cacheControl: 'public, max-age=31536000'
      },
      resumable: false,
    });

    // Make file public
    console.log("🔓 Making file public...");
    await fileUpload.makePublic();

    const publicUrl = `https://firebasestorage.googleapis.com/v0/b/${bucket.name}/o/${encodeURIComponent(filename)}?alt=media`;
    console.log("✅ File uploaded successfully:", publicUrl);
    
    return publicUrl;
  } catch (err) {
    console.error("❌ Firebase upload detailed error:", {
      message: err.message,
      code: err.code,
      details: err.details,
      stack: err.stack
    });
    
    // Throw more specific error
    if (err.code === 'ENOTFOUND') {
      throw new Error("Network error: Cannot connect to Firebase Storage");
    } else if (err.code === 403) {
      throw new Error("Permission denied: Check Firebase service account permissions");
    } else if (err.code === 404) {
      throw new Error("Bucket not found: Check storage bucket name");
    } else if (err.message.includes('bucket not available')) {
      throw new Error("Firebase initialization failed");
    } else {
      throw new Error(`Firebase upload failed: ${err.message}`);
    }
  }
};

module.exports = uploadToFirebase;