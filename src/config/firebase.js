const admin = require("firebase-admin");
const path = require("path");
const serviceAccount = require("./firebase-adminsdk.json"); 

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  storageBucket: "theaterhub-storage.firebasestorage.app", 
});

const bucket = admin.storage().bucket();

module.exports = { bucket };
