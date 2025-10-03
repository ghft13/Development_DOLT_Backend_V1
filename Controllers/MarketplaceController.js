// Simple in-memory marketplace storage (for development/testing)
let marketplaceProducts = [];

// Get all marketplace products
async function GetMarketplaceProducts(req, res) {
  try {
    res.status(200).json(marketplaceProducts);
  } catch (error) {
    //  console.error("Error fetching marketplace products:", error);
    res.status(500).json({ error: "Failed to retrieve marketplace products" });
  }
}

// Add a new marketplace product
async function AddMarketplaceProduct(req, res) {
  try {
    const {
      name,
      price,
      description,
      image,
      category,
      discount,
      rating,
      reviews,
      inStock,
    } = req.body;

    if (!name || !price || !description || !image) {
      return res
        .status(400)
        .json({ error: "Name, price, description, and image are required" });
    }

    const newProduct = {
      id: Date.now().toString(), // Simple ID generation
      name,
      price,
      description,
      image,
      category: category || "",
      discount: discount || 0,
      rating: rating || 0,
      reviews: reviews || 0,
      inStock: inStock !== undefined ? inStock : true,
      createdAt: new Date().toISOString(),
    };

    marketplaceProducts.push(newProduct);

    res.status(201).json(newProduct);
  } catch (error) {
    res.status(500).json({ error: "Failed to add product" });
  }
}

// Update a marketplace product
async function UpdateMarketplaceProduct(req, res) {
  try {
    const { id } = req.params;
    const {
      name,
      price,
      description,
      image,
      category,
      discount,
      rating,
      reviews,
      inStock,
    } = req.body;

    const productIndex = marketplaceProducts.findIndex((p) => p.id === id);

    if (productIndex === -1) {
      return res.status(404).json({ error: "Product not found" });
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

    marketplaceProducts[productIndex] = {
      ...marketplaceProducts[productIndex],
      ...updateObj,
      updatedAt: new Date().toISOString(),
    };

    res.json({ success: true, product: marketplaceProducts[productIndex] });
  } catch (error) {
    res.status(500).json({ error: "Failed to update product" });
  }
}

// Delete a marketplace product
async function DeleteMarketplaceProduct(req, res) {
  try {
    const { id } = req.params;

    const productIndex = marketplaceProducts.findIndex((p) => p.id === id);

    if (productIndex === -1) {
      return res.status(404).json({ error: "Product not found" });
    }

    const deletedProduct = marketplaceProducts.splice(productIndex, 1)[0];

    res.json({ success: true, deletedProduct });
  } catch (error) {
    res.status(500).json({ error: "Failed to delete product" });
  }
}

module.exports = {
  GetMarketplaceProducts,
  AddMarketplaceProduct,
  UpdateMarketplaceProduct,
  DeleteMarketplaceProduct,
};
