const express = require("express");
const router = express.Router();
const {
  GetMarketplaceProducts,
  AddMarketplaceProduct,
  UpdateMarketplaceProduct,
  DeleteMarketplaceProduct,
} = require("../Controllers/auth/ServiceAuth");
// --- Marketplace Product CRUD for admin ---
router.get("/", GetMarketplaceProducts);
router.post("/", AddMarketplaceProduct);
router.put("/:id", UpdateMarketplaceProduct);
router.delete("/:id", DeleteMarketplaceProduct);

module.exports = router;
