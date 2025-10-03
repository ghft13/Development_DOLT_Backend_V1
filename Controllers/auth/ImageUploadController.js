const { admin } = require("../../Config/FireBase");

// Generic image upload endpoint
async function uploadImage(req, res) {
  try {
    if (!req.body.image) {
      return res.status(400).json({ error: "No image data provided" });
    }

    let base64String = req.body.image;
    const folder = req.body.folder || "images";
    
    // Extract base64 data if data URL prefix is present
    let contentType = "image/jpeg"; // default
    if (base64String.startsWith("data:")) {
      const matches = base64String.match(/^data:([^;]+);base64,(.+)$/);
      if (matches) {
        contentType = matches[1];
        base64String = matches[2];
      }
    }

    // Determine file extension based on content type
    let fileExtension = "jpg";
    if (contentType.includes("png")) fileExtension = "png";
    else if (contentType.includes("gif")) fileExtension = "gif";
    else if (contentType.includes("webp")) fileExtension = "webp";
    else if (contentType.includes("jpeg")) fileExtension = "jpg";

    const buffer = Buffer.from(base64String, "base64");
    const filename = `${folder}/${Date.now()}_${Math.random().toString(36).substring(2, 8)}.${fileExtension}`;
    
    // Get the storage bucket
    const bucket = admin.storage().bucket();
    
    // Check if bucket exists and is accessible
    try {
      await bucket.getMetadata();
    } catch (bucketError) {
      console.error("Bucket access error:", bucketError);
      return res.status(500).json({ 
        error: "Firebase Storage bucket not accessible. Please check your bucket configuration and permissions.",
        details: "Make sure FIREBASE_STORAGE_BUCKET is set correctly in your .env file"
      });
    }

    const file = bucket.file(filename);

    // Upload the file
    await file.save(buffer, {
      metadata: { 
        contentType: contentType,
        cacheControl: 'public, max-age=31536000' // Cache for 1 year
      },
      public: true,
      validation: "md5"
    });

    // Make the file public and get the public URL
    await file.makePublic();
    
    // Get the public URL
    const url = `https://storage.googleapis.com/${bucket.name}/${filename}`;

    console.log(`Image uploaded successfully: ${url}`);
    return res.json({ 
      url,
      filename,
      success: true 
    });

  } catch (error) {
   // console.error("Firebase Storage upload error:", error);
    
    // Provide more specific error messages
    if (error.code === 'storage/unauthorized') {
      return res.status(500).json({ error: "Firebase storage unauthorized. Check your service account permissions." });
    } else if (error.code === 'storage/bucket-not-found' || error.status === 404) {
      return res.status(500).json({ 
        error: "Firebase storage bucket not found. Please check your bucket configuration.",
        details: "Current bucket: " + (process.env.FIREBASE_STORAGE_BUCKET || 'not set'),
        solution: "Set FIREBASE_STORAGE_BUCKET in your .env file to your correct bucket name"
      });
    } else {
      return res.status(500).json({ 
        error: "Failed to upload image to Firebase storage",
        details: error.message || 'Unknown error'
      });
    }
  }
}

module.exports = {
  uploadImage
};