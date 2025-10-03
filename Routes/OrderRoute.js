const express = require("express");
const router = express.Router();
const { createOrder, getUserOrders } = require("../Controllers/OrderController.js");

router.post("/create", createOrder);
router.get("/user/:userId", getUserOrders);

module.exports = router;
