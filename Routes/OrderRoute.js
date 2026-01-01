const express = require("express");
const router = express.Router();
const { createOrder, getUserOrders } = require("../Controllers/auth/OrderController.js");

// POST /api/orders/create - Create a new order
router.post("/create", createOrder);

// GET /api/orders/user/:userId - Get orders for a specific user
router.get("/user/:userId", getUserOrders);

// GET /api/orders/provider/all - Get all orders for provider
router.get("/provider/all", require("../Controllers/auth/OrderController.js").getProviderOrders);

// PUT /api/orders/accept - Accept an order
router.put("/accept", require("../Controllers/auth/OrderController.js").acceptOrder);

// PUT /api/orders/status - Update order status (shipped/delivered)
router.put("/status", require("../Controllers/auth/OrderController.js").updateOrderStatus);

module.exports = router;
