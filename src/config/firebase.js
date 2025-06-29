const admin = require("firebase-admin");

const base64Config = process.env.FIREBASE_CONFIG_BASE64;
if (!base64Config) {
  console.error("Missing FIREBASE_CONFIG_BASE64");
  process.exit(1);
}

const serviceAccount = JSON.parse(
  Buffer.from(base64Config, "base64").toString("utf8")
);

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  storageBucket: "theaterhub-storage.appspot.com", 
});

const bucket = admin.storage().bucket();

module.exports = { bucket };
