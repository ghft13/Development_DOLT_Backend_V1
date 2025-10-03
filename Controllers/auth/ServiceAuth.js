const { db, admin } = require("../../Config/FireBase");
const initialServices = require("../../Data/ServiceData");

// Get all services
async function GetServicePrice(req, res) {
  try {
    const snapshot = await db.collection("services").get();
    const servicePrices = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
    res.status(200).json(servicePrices);
  } catch (error) {
    console.error("Error fetching service prices:", error);
    res.status(500).json({ error: "Failed to retrieve service prices" });
  }
}

// Add a new service
async function AddService(req, res) {
  try {
    const { name, price } = req.body;
    if (!name || !price) return res.status(400).json({ error: "Name and price required" });
    const docRef = await db.collection("services").add({ name, price });
    res.status(201).json({ id: docRef.id, name, price });
  } catch (error) {
    res.status(500).json({ error: "Failed to add service" });
  }
}

// Update a service
async function UpdateService(req, res) {
  try {
    const { id } = req.params;
    const { name, price } = req.body;
    if (!name && !price) return res.status(400).json({ error: "Nothing to update" });
    const updateObj = {};
    if (name) updateObj.name = name;
    if (price) updateObj.price = price;
    await db.collection("services").doc(id).update(updateObj);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: "Failed to update service" });
  }
}

// Delete a service
async function DeleteService(req, res) {
  try {
    const { id } = req.params;
    await db.collection("services").doc(id).delete();
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: "Failed to delete service" });
  }
}

// Seed initial services if not present
async function SeedInitialServices() {
  const snapshot = await db.collection("services").get();
  if (snapshot.empty) {
    for (const service of initialServices) {
      await db.collection("services").add(service);
    }
    // console.log("Seeded initial services to Firestore.");
  }
}

// Get all marketplace products
async function GetMarketplaceProducts(req, res) {
  try {
    const snapshot = await db.collection("marketplace").get();
    const products = snapshot.docs.map(doc => {
      const data = doc.data();
      let price = data.price;
      if (typeof price === 'number') {
        price = price + '$';
      } else if (typeof price === 'string' && !price.trim().endsWith('$')) {
        price = price.replace(/[^0-9.]/g, '') + '$';
      }
      return {
        id: doc.id,
        name: data.name,
        price,
        description: data.description || "",
        image: data.image || "",
        category: data.category || "",
        discount: data.discount || 0,
        rating: data.rating || 0,
        reviews: data.reviews || 0,
        inStock: data.inStock !== undefined ? data.inStock : true
      };
    });
    res.status(200).json(products);
  } catch (error) {
    // console.error("Error fetching marketplace products:", error);
    res.status(500).json({ error: "Failed to retrieve marketplace products" });
  }
}

// Add a new marketplace product
async function AddMarketplaceProduct(req, res) {
  try {
    const { name, price, description, image, category, discount, rating, reviews, inStock } = req.body;
    // Fix: Check for empty string or undefined/null for required fields
    if (!name || !price || !description || !image ||
        name.trim() === "" || price.toString().trim() === "" || description.trim() === "" || image.trim() === "") {
      return res.status(400).json({ error: "Name, price, description, and image are required" });
    }
    // Set defaults for optional fields if not provided
    const docRef = await db.collection("marketplace").add({
      name,
      price,
      description,
      image,
      category: category || "",
      discount: typeof discount === "number" ? discount : 0,
      rating: typeof rating === "number" ? rating : 0,
      reviews: typeof reviews === "number" ? reviews : 0,
      inStock: typeof inStock === "boolean" ? inStock : true
    });
    res.status(201).json({ id: docRef.id, name, price, description, image, category: category || "", discount: typeof discount === "number" ? discount : 0, rating: typeof rating === "number" ? rating : 0, reviews: typeof reviews === "number" ? reviews : 0, inStock: typeof inStock === "boolean" ? inStock : true });
  } catch (error) {
  
    res.status(500).json({ error: "Failed to add product" });
  }
}

// Update a marketplace product
async function UpdateMarketplaceProduct(req, res) {
  try {
    const { id } = req.params;
    const { name, price, description, image, category, discount, rating, reviews, inStock } = req.body;
    if (!name && !price && !description && !image && !category && !discount && !rating && !reviews && inStock === undefined) {
      return res.status(400).json({ error: "Nothing to update" });
    }
    const updateObj = {};
    if (name) updateObj.name = name;
    if (price) updateObj.price = price;
    if (description) updateObj.description = description;
    if (image) updateObj.image = image;
    if (category) updateObj.category = category;
    if (discount !== undefined) updateObj.discount = discount;
    if (rating !== undefined) updateObj.rating = rating;
    if (reviews !== undefined) updateObj.reviews = reviews;
    if (inStock !== undefined) updateObj.inStock = inStock;
    await db.collection("marketplace").doc(id).update(updateObj);
    res.json({ success: true });
  } catch (error) {
    console.error("Failed to update product:", error);
    res.status(500).json({ error: "Failed to update product" });
  }
}

// Delete a marketplace product
async function DeleteMarketplaceProduct(req, res) {
  try {
    const { id } = req.params;
    await db.collection("marketplace").doc(id).delete();
    res.json({ success: true });
  } catch (error) {
    console.error("Failed to delete product:", error);
    res.status(500).json({ error: "Failed to delete product" });
  }
}

// Image upload endpoint using Firebase Storage
async function UploadMarketplaceImage(req, res) {
  try {
    if (!req.body.image) {
      return res.status(400).json({ error: "No image data provided" });
    }

    let base64String = req.body.image;
    
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
    const filename = `marketplace/${Date.now()}_${Math.random().toString(36).substring(2, 8)}.${fileExtension}`;
    
    // Get the storage bucket
    const bucket = admin.storage().bucket();
    
    // Check if bucket exists and is accessible
    try {
      await bucket.getMetadata();
    } catch (bucketError) {
    
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

   
    return res.json({ 
      url,
      filename,
      success: true 
    });

  } catch (error) {
 
    
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

// Profile image upload endpoint
async function UploadProfileImage(req, res) {
  try {
    if (!req.file) {
      return res.status(400).json({ error: "No image file provided" });
    }
    // Assuming multer is used for file upload
    const url = `${process.env.SERVER_URL || ""}/uploads/${req.file.filename}`;
    res.json({ url });
  } catch (error) {
    res.status(500).json({ error: "Failed to upload profile image" });
  }
}

module.exports = { 
  GetServicePrice, 
  AddService, 
  UpdateService, 
  DeleteService, 
  SeedInitialServices,
  GetMarketplaceProducts,
  AddMarketplaceProduct,
  UpdateMarketplaceProduct,
  DeleteMarketplaceProduct,
  UploadMarketplaceImage,
  UploadProfileImage
};
    

module.exports = { 
  GetServicePrice, 
  AddService, 
  UpdateService, 
  DeleteService, 
  SeedInitialServices,
  GetMarketplaceProducts,
  AddMarketplaceProduct,
  UpdateMarketplaceProduct,
  DeleteMarketplaceProduct,
  UploadMarketplaceImage,
  UploadProfileImage
};
