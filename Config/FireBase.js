require("dotenv").config(); // This loads the environment variables from the .env file

const admin = require("firebase-admin");

let serviceAccount;

try {
  // Ensure the environment variable is available
  if (!process.env.FIREBASE_SERVICE_ACCOUNT_BASE64) {
    throw new Error("FIREBASE_SERVICE_ACCOUNT_BASE64 not set in environment.");
  }

  // Decode the base64 string to get the service account JSON
  const decodedJson = Buffer.from(
    process.env.FIREBASE_SERVICE_ACCOUNT_BASE64,
    "base64"
  ).toString("utf8");

  // Parse the decoded JSON string into an object
  serviceAccount = JSON.parse(decodedJson);
} catch (error) {
  console.error(
    "Failed to load Firebase service account from environment:",
    error
  );
  process.exit(1); // Exiting on error as Firebase initialization is crucial
}

// Check if storage bucket is configured
if (!process.env.FIREBASE_STORAGE_BUCKET) {
  process.exit(1);
}

// Initialize Firebase Admin if not already initialized
if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    storageBucket: process.env.FIREBASE_STORAGE_BUCKET,
  });

  // Test storage bucket access
  const bucket = admin.storage().bucket();
  bucket
    .getMetadata()
    .then(() => {})
    .catch((error) => {});

  // Test Firestore connection
  const dbCheck = admin.firestore();
  dbCheck
    .listCollections()
    .then((collections) => {})
    .catch((error) => {
      console.error("Firestore access failed:", error.message);
    });
}

const db = admin.firestore(); // Access Firestore

module.exports = { admin, db };
