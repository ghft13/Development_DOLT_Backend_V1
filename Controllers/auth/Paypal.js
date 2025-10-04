const express = require("express");
const paypal = require("@paypal/checkout-server-sdk");
const paypalClient = require("../../Utils/paypalClient");

const router = express.Router();

// ✅ Create PayPal order
router.post("/create-order", async (req, res) => {
  const { amount } = req.body;

  

  if (!amount || isNaN(amount) || Number(amount) <= 0) {
    // console.error("❌ Invalid amount:", amount);
    return res.status(400).json({ message: "Invalid amount" });
  }

  const request = new paypal.orders.OrdersCreateRequest();
  request.prefer("return=representation");
  request.requestBody({
    intent: "CAPTURE",
    purchase_units: [
      {
        amount: { 
          currency_code: "USD", 
          value: parseFloat(amount).toFixed(2) 
        },
      },
    ],
    application_context: {
      brand_name: "Your Business Name",
      landing_page: "BILLING",
      user_action: "PAY_NOW",
      return_url: "http://localhost:3000/success",
      cancel_url: "http://localhost:3000/cancel"
    }
  });

  try {
    const order = await paypalClient.execute(request);
    // console.log("✅ Order created successfully:", order.result.id);
    // console.log("📦 Order details:", JSON.stringify(order.result, null, 2));
    res.json({ id: order.result.id });
  } catch (err) {
    console.error("❌ PayPal Create Error:", err.message);
    console.error("Error details:", err);
    res.status(500).json({ 
      message: "Error creating PayPal order", 
      error: err.message 
    });
  }
});

// ✅ Capture PayPal order
router.post("/capture-order", async (req, res) => {
  const { orderId, uid } = req.body;

  // console.log("📨 Received capture-order request:", { orderId, uid });

  if (!orderId) {
    console.error("❌ Missing orderId");
    return res.status(400).json({ message: "Missing orderId" });
  }

  const request = new paypal.orders.OrdersCaptureRequest(orderId);
  request.requestBody({});

  try {
    const capture = await paypalClient.execute(request);
    // console.log("✅ Payment captured successfully!");
    // console.log("💰 Capture details:", JSON.stringify(capture.result, null, 2));
    
    // TODO: Save payment to database using uid
    // console.log("💾 TODO: Save to database for user:", uid);
    
    res.json({ 
      status: "success", 
      capture: capture.result,
      message: "Payment captured successfully"
    });
  } catch (err) {
    console.error("❌ PayPal Capture Error:", err.message);
    console.error("Error details:", err);
    res.status(500).json({ 
      message: "Error capturing PayPal order", 
      error: err.message 
    });
  }
});

module.exports = router;