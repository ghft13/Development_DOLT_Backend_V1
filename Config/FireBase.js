require('dotenv').config();  // This loads the environment variables from the .env file

const admin = require("firebase-admin");

let serviceAccount;

try {
  // Ensure the environment variable is available
  if (!process.env.FIREBASE_SERVICE_ACCOUNT_BASE64) {
    throw new Error("FIREBASE_SERVICE_ACCOUNT_BASE64 not set in environment.");
  }

  // Decode the base64 string to get the service account JSON
  const decodedJson = Buffer.from(process.env.FIREBASE_SERVICE_ACCOUNT_BASE64, "base64").toString("utf8");

  // Parse the decoded JSON string into an object
  serviceAccount = JSON.parse(decodedJson);
  
   console.log("Firebase service account loaded successfully");
  // console.log("Project ID:", serviceAccount.project_id);
} catch (error) {
  console.error("Failed to load Firebase service account from environment:", error);
  process.exit(1);  // Exiting on error as Firebase initialization is crucial
}

// Check if storage bucket is configured
if (!process.env.FIREBASE_STORAGE_BUCKET) {
  console.error("FIREBASE_STORAGE_BUCKET not set in environment.");
  // console.error("Please set FIREBASE_STORAGE_BUCKET in your .env file");
  // console.error("Example: FIREBASE_STORAGE_BUCKET=your-project-id.appspot.com");
  process.exit(1);
}

//console.log("Firebase Storage Bucket:", process.env.FIREBASE_STORAGE_BUCKET);

// Initialize Firebase Admin if not already initialized
if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    storageBucket: process.env.FIREBASE_STORAGE_BUCKET,
  });

  console.log("Firebase Admin initialized successfully.");
  
  // Test storage bucket access
  const bucket = admin.storage().bucket();
  bucket.getMetadata()
    .then(() => {
      console.log("Firebase Storage bucket is accessible");
    })
    .catch((error) => {
      console.error("Firebase Storage bucket access failed:", error.message);
   //   console.error("Please check your bucket configuration and permissions");
    });

  // Test Firestore connection
  const dbCheck = admin.firestore();
  dbCheck.listCollections()
    .then(collections => {
  //    console.log(`Firestore is accessible. Found ${collections.length} collections.`);
    })
    .catch(error => {
      console.error("Firestore access failed:", error.message);
  //    console.error("Please check your Firestore database rules and permissions.");
    });
}

const db = admin.firestore();  // Access Firestore

module.exports = { admin, db };
