// routes/paypalRoutes.js
const express = require("express");
const paypal = require("@paypal/checkout-server-sdk");
const paypalClient = require("../../Utils/paypalClient");

const router = express.Router();

/**
 * ✅ Helper: Format currency safely
 */
const formatAmount = (amount) => parseFloat(amount).toFixed(2);

/**
 * ✅ POST /api/paypal/create-order
 * Creates a new PayPal order
 */
router.post("/create-order", async (req, res) => {
  try {
    // console.log("🔗 PayPal Create Order Request:", req.body);
    const { amount } = req.body;

    
    if (!amount || isNaN(amount) || Number(amount) <= 0) {
      return res.status(400).json({ message: "Invalid amount" });
    }

    // 🧾 Create order
    const request = new paypal.orders.OrdersCreateRequest();
    request.prefer("return=representation");
    request.requestBody({
      intent: "CAPTURE",
      purchase_units: [
        {
          amount: {
            currency_code: "USD",
            value: formatAmount(amount),
          },
        },
      ],
      application_context: {
        brand_name: "Get It Done", // ✅ replace with your project name
        landing_page: "BILLING",
        user_action: "PAY_NOW",
        return_url: process.env.PAYPAL_RETURN_URL || "http://localhost:3000/success",
        cancel_url: process.env.PAYPAL_CANCEL_URL || "http://localhost:3000/cancel",
      },
    });

  
    const order = await paypalClient.execute(request);

    return res.status(201).json({
      id: order.result.id,
      status: order.result.status,
      links: order.result.links,
    });
  } catch (error) {
    console.error("❌ PayPal Create Order Error:", error);
    return res.status(500).json({
      message: "Error creating PayPal order",
      error: error.message,
    });
  }
});


router.post("/capture-order", async (req, res) => {
  try {
    const { orderId, uid } = req.body;
    // console.log(req.body,'Capture order')

    // 🔍 Validate input
    if (!orderId) {
      return res.status(400).json({ message: "Missing orderId" });
    }

    const request = new paypal.orders.OrdersCaptureRequest(orderId);
    request.requestBody({});

    // 🚀 Execute PayPal capture
    const capture = await paypalClient.execute(request);

    // 💾 TODO: Save capture details to DB (e.g., MongoDB)
    // await Payment.create({
    //   uid,
    //   orderId,
    //   transactionId: capture.result.purchase_units[0].payments.captures[0].id,
    //   amount: capture.result.purchase_units[0].amount.value,
    //   currency: capture.result.purchase_units[0].amount.currency_code,
    //   status: capture.result.status,
    //   payer: capture.result.payer.email_address,
    // });

    return res.status(200).json({
      status: "success",
      orderId,
      capture: capture.result,
      message: "Payment captured successfully",
      
    });


  } catch (error) {
    console.error("❌ PayPal Capture Error:", error);
    return res.status(500).json({
      message: "Error capturing PayPal payment",
      error: error.message,
    });
  }
});

module.exports = router;
