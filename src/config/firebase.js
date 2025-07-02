const admin = require("firebase-admin");

let bucket = null;
let isInitialized = false;

const initializeFirebase = async () => {
  if (isInitialized) {
    return bucket;
  }

  try {
    const base64Config = process.env.FIREBASE_CONFIG_BASE64;

    if (!base64Config) {
      throw new Error("Missing FIREBASE_CONFIG_BASE64 environment variable");
    }

    console.log("🔑 Firebase config found, decoding...");
    
    const configString = Buffer.from(base64Config, "base64").toString("utf8");
    const serviceAccount = JSON.parse(configString);
    
    console.log("✅ Firebase config decoded successfully");
    console.log("🏗️ Project ID:", serviceAccount.project_id);

    // Initialize Firebase Admin
    if (!admin.apps.length) {
      admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
        storageBucket: "theaterhub-storage.firebasestorage.app"
      });
      console.log("🚀 Firebase Admin initialized successfully");
    }

    bucket = admin.storage().bucket();
    
    // Test bucket
    const [exists] = await bucket.exists();
    if (exists) {
      console.log("✅ Storage bucket accessible");
      isInitialized = true;
      return bucket;
    } else {
      throw new Error("Storage bucket not found");
    }

  } catch (error) {
    console.error("❌ Error initializing Firebase:", error.message);
    throw error;
  }
};

// Initialize immediately
initializeFirebase().catch(err => {
  console.error("❌ Failed to initialize Firebase:", err.message);
  process.exit(1);
});

// Getter function for bucket
const getBucket = async () => {
  if (!isInitialized) {
    await initializeFirebase();
  }
  return bucket;
};

module.exports = { 
  bucket, 
  admin, 
  getBucket,
  initializeFirebase 
};