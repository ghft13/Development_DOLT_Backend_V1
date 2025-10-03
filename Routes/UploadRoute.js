const express = require("express");
const router = express.Router();
const multer = require("multer");
const cloudinary = require("cloudinary").v2;
const streamifier = require("streamifier");

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

const upload = multer();

router.post("/profile", upload.single("image"), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: "No image file" });

    // Upload to Cloudinary using a stream
    let cld_upload_stream = cloudinary.uploader.upload_stream(
      { folder: "profile_pics" },
      function (error, result) {
        if (error) {
          return res.status(500).json({ error: "Cloudinary upload failed" });
        }
        return res.json({ url: result.secure_url });
      }
    );
    streamifier.createReadStream(req.file.buffer).pipe(cld_upload_stream);
  } catch (err) {
    res.status(500).json({ error: "Failed to upload image" });
  }
});

module.exports = router;
