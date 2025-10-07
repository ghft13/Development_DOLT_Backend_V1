const express = require("express");
const paypal = require("@paypal/checkout-server-sdk");
const paypalClient = require("../../Utils/paypalClient");

const router = express.Router();

// ✅ Create PayPal order
router.post("/create-order", async (req, res) => {
  console.log("\n🟦 [CREATE ORDER] Request received at /paypal/create-order");
  console.log("📩 Raw request body:", req.body);

  const { amount } = req.body;

  if (!amount || isNaN(amount) || Number(amount) <= 0) {
    console.error("❌ Invalid amount received:", amount);
    return res.status(400).json({ message: "Invalid amount" });
  }

  console.log(`💰 Validated amount: ${amount}`);

  const request = new paypal.orders.OrdersCreateRequest();
  request.prefer("return=representation");
  request.requestBody({
    intent: "CAPTURE",
    purchase_units: [
      {
        amount: { 
          currency_code: "USD", 
          value: parseFloat(amount).toFixed(2),
        },
      },
    ],
    application_context: {
      brand_name: "Your Business Name",
      landing_page: "BILLING",
      user_action: "PAY_NOW",
      return_url: "http://localhost:3000/success",
      cancel_url: "http://localhost:3000/cancel",
    },
  });

  try {
    console.log("🚀 Sending order creation request to PayPal...");

    const order = await paypalClient.execute(request);

    console.log("✅ PayPal order successfully created!");
    console.log("🧾 PayPal Response ID:", order.result.id);
    console.log("📦 PayPal Response Object:", JSON.stringify(order.result, null, 2));

    res.json({ id: order.result.id });
  } catch (err) {
    console.error("❌ [CREATE ORDER ERROR]");
    console.error("📛 Error message:", err.message);
    console.error("🧠 Error details:", err);

    if (err.response) {
      console.error("📨 PayPal API Response Status:", err.response.statusCode);
      console.error("📨 PayPal API Response Body:", JSON.stringify(err.response.result, null, 2));
    }

    res.status(500).json({
      message: "Error creating PayPal order",
      error: err.message,
    });
  }
});

// ✅ Capture PayPal order
router.post("/capture-order", async (req, res) => {
  console.log("\n🟩 [CAPTURE ORDER] Request received at /paypal/capture-order");
  console.log("📩 Raw request body:", req.body);

  const { orderId, uid } = req.body;

  if (!orderId) {
    console.error("❌ Missing orderId in request body");
    return res.status(400).json({ message: "Missing orderId" });
  }

  console.log(`🔗 Capturing PayPal order: ${orderId}`);
  if (uid) console.log(`👤 For user ID: ${uid}`);

  const request = new paypal.orders.OrdersCaptureRequest(orderId);
  request.requestBody({});

  try {
    console.log("🚀 Sending capture request to PayPal...");
    const capture = await paypalClient.execute(request);

    console.log("✅ Payment successfully captured!");
    console.log("💰 Capture Response Summary:");
    console.log("🧾 ID:", capture.result.id);
    console.log("📅 Status:", capture.result.status);
    console.log("💳 Amount:", capture.result.purchase_units?.[0]?.payments?.captures?.[0]?.amount);

    res.json({
      status: "success",
      capture: capture.result,
      message: "Payment captured successfully",
    });
  } catch (err) {
    console.error("❌ [CAPTURE ORDER ERROR]");
    console.error("📛 Error message:", err.message);
    console.error("🧠 Error details:", err);

    if (err.response) {
      console.error("📨 PayPal API Response Status:", err.response.statusCode);
      console.error("📨 PayPal API Response Body:", JSON.stringify(err.response.result, null, 2));
    }

    res.status(500).json({
      message: "Error capturing PayPal order",
      error: err.message,
    });
  }
});

module.exports = router;
