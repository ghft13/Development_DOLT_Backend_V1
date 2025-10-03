const cloudinary = require('../../Config/cloudinary');

// Upload image to Cloudinary
async function uploadImageToCloudinary(req, res) {
  try {
    if (!req.body.image) {
      return res.status(400).json({ error: "No image data provided" });
    }

    let base64String = req.body.image;
    const folder = req.body.folder || "doit-images";
    
    // Extract base64 data if data URL prefix is present
    if (base64String.startsWith("data:")) {
      const matches = base64String.match(/^data:([^;]+);base64,(.+)$/);
      if (matches) {
        base64String = matches[2];
      }
    }

    // Upload to Cloudinary
    const result = await cloudinary.uploader.upload(
      `data:image/jpeg;base64,${base64String}`,
      {
        folder: folder,
        resource_type: "image",
        transformation: [
          { quality: "auto:good" }, // Optimize quality
          { fetch_format: "auto" }  // Auto format (webp for modern browsers)
        ],
        public_id: `${Date.now()}_${Math.random().toString(36).substring(2, 8)}`
      }
    );

    // console.log(`Image uploaded successfully to Cloudinary: ${result.secure_url}`);
    
    return res.json({
      url: result.secure_url,
      public_id: result.public_id,
      width: result.width,
      height: result.height,
      format: result.format,
      size: result.bytes,
      success: true
    });

  } catch (error) {
    console.error("Cloudinary upload error:", error);
    return res.status(500).json({
      error: "Failed to upload image to Cloudinary",
      details: error.message || 'Unknown error'
    });
  }
}

// Upload multiple images
async function uploadMultipleImages(req, res) {
  try {
    if (!req.body.images || !Array.isArray(req.body.images)) {
      return res.status(400).json({ error: "No images array provided" });
    }

    const folder = req.body.folder || "doit-images";
    const uploadPromises = req.body.images.map(async (imageData, index) => {
      let base64String = imageData;
      
      if (base64String.startsWith("data:")) {
        const matches = base64String.match(/^data:([^;]+);base64,(.+)$/);
        if (matches) {
          base64String = matches[2];
        }
      }

      const result = await cloudinary.uploader.upload(
        `data:image/jpeg;base64,${base64String}`,
        {
          folder: folder,
          resource_type: "image",
          transformation: [
            { quality: "auto:good" },
            { fetch_format: "auto" }
          ],
          public_id: `${Date.now()}_${index}_${Math.random().toString(36).substring(2, 8)}`
        }
      );

      return {
        url: result.secure_url,
        public_id: result.public_id,
        width: result.width,
        height: result.height,
        format: result.format,
        size: result.bytes
      };
    });

    const results = await Promise.all(uploadPromises);
    
    return res.json({
      images: results,
      success: true
    });

  } catch (error) {
 //   console.error("Multiple images upload error:", error);
    return res.status(500).json({
      error: "Failed to upload images to Cloudinary",
      details: error.message || 'Unknown error'
    });
  }
}

// Delete image from Cloudinary
async function deleteImageFromCloudinary(req, res) {
  try {
    const { public_id } = req.body;
    
    if (!public_id) {
      return res.status(400).json({ error: "Public ID is required" });
    }

    const result = await cloudinary.uploader.destroy(public_id);
    
    if (result.result === 'ok') {
      return res.json({ 
        success: true, 
        message: "Image deleted successfully" 
      });
    } else {
      return res.status(400).json({ 
        error: "Failed to delete image" 
      });
    }

  } catch (error) {
 //   console.error("Cloudinary delete error:", error);
    return res.status(500).json({
      error: "Failed to delete image from Cloudinary",
      details: error.message || 'Unknown error'
    });
  }
}

// Get optimized image URL with transformations
function getOptimizedImageUrl(publicId, options = {}) {
  const {
    width = 'auto',
    height = 'auto',
    quality = 'auto:good',
    format = 'auto',
    crop = 'fill'
  } = options;

  return cloudinary.url(publicId, {
    width,
    height,
    quality,
    format,
    crop,
    secure: true
  });
}

module.exports = {
  uploadImageToCloudinary,
  uploadMultipleImages,
  deleteImageFromCloudinary,
  getOptimizedImageUrl
}; 