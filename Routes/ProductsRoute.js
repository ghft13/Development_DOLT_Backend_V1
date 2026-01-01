const express = require("express")
const {
  addProduct,
  getAllProducts,
  updateProduct,
  deleteProduct,
} = require("../Controllers/auth/Product.js")

const router = express.Router();

router.post("/add", addProduct);
router.get("/get", getAllProducts);
router.put("/update/:id", updateProduct);
router.delete("/delete/:id", deleteProduct);

module.exports = router;