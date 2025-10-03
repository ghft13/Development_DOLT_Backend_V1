const express = require("express");
const { uploadImage } = require("../Controllers/auth/ImageUploadController");
const { 
  uploadImageToCloudinary, 
  uploadMultipleImages, 
  deleteImageFromCloudinary 
} = require("../Controllers/auth/CloudinaryUploadController");

const router = express.Router();

// POST /api/upload/image - Upload image to Firebase Storage
router.post("/image", uploadImage);

// Cloudinary routes (new)
router.post("/cloudinary", uploadImageToCloudinary);
router.post("/cloudinary/multiple", uploadMultipleImages);
router.delete("/cloudinary", deleteImageFromCloudinary);

module.exports = router; 