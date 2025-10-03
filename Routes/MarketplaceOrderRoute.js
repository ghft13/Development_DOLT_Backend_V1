const express = require("express");
const router = express.Router();
const { createMarketplaceOrder, getUserMarketplaceOrders, getAllMarketplaceOrders } = require("../Controllers/MarketplaceOrderController.js");

router.post("/create", createMarketplaceOrder);
router.get("/user/:userId", getUserMarketplaceOrders);
router.get("/all", getAllMarketplaceOrders);

module.exports = router; 