const { db } = require("../../Config/FireBase.js");

// 🟩 Add a new product
const addProduct = async (req, res) => {
  try {
    const { name, category, price, stock, image, rating, description } = req.body;
  
    // ✅ Validate all required fields
    if (!name || !category || !price || !stock ) {
      return res.status(400).json({
        success: false,
        message: "Missing required fields: name, category, price, stock, image",
      });
    }

    // ✅ Prepare clean product data
    const productData = {
      name: name.trim(),
      category: category.trim(),
      price: Number(price),
      stock: Number(stock),
      image: image.trim(),
      rating: rating ? Number(rating) : 0, // default 0 if not provided
      description: description ? description.trim() : "",
      createdAt: new Date(),
    };

    // ✅ Save to Firestore
    const docRef = await db.collection("products").add(productData);

    res.status(201).json({
      success: true,
      message: "Product added successfully",
      id: docRef.id,
      data: { _id: docRef.id, ...productData },
    });
  } catch (error) {
    console.error("Error adding product:", error);
    res.status(500).json({ success: false, message: "Failed to add product", error: error.message });
  }
};

// 🟨 Get all products
const getAllProducts = async (req, res) => {
  try {
    const snapshot = await db.collection("products").get();
    const products = snapshot.docs.map((doc) => ({
      _id: doc.id,
      ...doc.data(),
    }));

    res.status(200).json({ success: true, data: products });
  } catch (error) {
    console.error("Error fetching products:", error);
    res.status(500).json({ success: false, message: "Failed to fetch products", error: error.message });
  }
};

// 🟦 Update a product
const updateProduct = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, category, price, stock, image, rating, description } = req.body;

    if (!id) {
      return res.status(400).json({ success: false, message: "Product ID is required" });
    }

    const updatedData = {};

    // ✅ Only update provided fields
    if (name) updatedData.name = name.trim();
    if (category) updatedData.category = category.trim();
    if (price !== undefined) updatedData.price = Number(price);
    if (stock !== undefined) updatedData.stock = Number(stock);
    if (image) updatedData.image = image.trim();
    if (rating !== undefined) updatedData.rating = Number(rating);
    if (description) updatedData.description = description.trim();
    updatedData.updatedAt = new Date();

    await db.collection("products").doc(id).update(updatedData);

    res.status(200).json({
      success: true,
      message: "Product updated successfully",
    });
  } catch (error) {
    console.error("Error updating product:", error);
    res.status(500).json({ success: false, message: "Failed to update product", error: error.message });
  }
};

// 🟥 Delete a product
const deleteProduct = async (req, res) => {
  try {
    const { id } = req.params;

    if (!id) {
      return res.status(400).json({ success: false, message: "Product ID is required" });
    }

    await db.collection("products").doc(id).delete();

    res.status(200).json({
      success: true,
      message: "Product deleted successfully",
    });
  } catch (error) {
    console.error("Error deleting product:", error);
    res.status(500).json({ success: false, message: "Failed to delete product", error: error.message });
  }
};

module.exports = { addProduct, getAllProducts, updateProduct, deleteProduct };
