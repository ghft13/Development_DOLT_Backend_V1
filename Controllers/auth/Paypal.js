const express = require("express");
const dotenv = require("dotenv");
const path = require("path");

dotenv.config();
const router = express.Router();

const { PAYPAL_CLIENT_ID, PAYPAL_CLIENT_SECRET } = process.env;
const base = "https://api-m.sandbox.paypal.com";

// Dynamically import `node-fetch`
const fetch = (...args) =>
  import("node-fetch").then(({ default: fetch }) => fetch(...args));

/**
 * Generate PayPal Access Token
 */
const generateAccessToken = async () => {
  try {
    if (!PAYPAL_CLIENT_ID || !PAYPAL_CLIENT_SECRET) {
      throw new Error("MISSING_API_CREDENTIALS");
    }

    const auth = Buffer.from(
      `${PAYPAL_CLIENT_ID}:${PAYPAL_CLIENT_SECRET}`
    ).toString("base64");

    const response = await fetch(`${base}/v1/oauth2/token`, {
      method: "POST",
      body: "grant_type=client_credentials",
      headers: {
        Authorization: `Basic ${auth}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
    });

    const data = await response.json();
    if (!response.ok) {
      throw new Error(`Error generating token: ${JSON.stringify(data)}`);
    }

    return data.access_token;
  } catch (error) {
  //  console.error("❌ Failed to generate Access Token:", error.message);
    throw error;
  }
};

/**
 * Create PayPal Order
 */

const createOrder = async (cart) => {
  try {
    const accessToken = await generateAccessToken();
    const url = `${base}/v2/checkout/orders`;
   

   const total = Array.isArray(cart)
  ? cart.reduce(
      (sum, item) =>
        sum + parseFloat(item.price || 0) * (parseInt(item.quantity) || 1),
      0
    )
  : parseFloat(cart.price || 0);

    const value = isNaN(total) ? "0.00" : total.toFixed(2)
    const totalvalue=value*cart.quantity
  
    const payload = {
      intent: "CAPTURE",
      purchase_units: [
        {
          amount: {
            currency_code: "USD",
            value: value, // Modify dynamically if needed
          },
        },
      ],
    };

    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify(payload),
    });

    return handleResponse(response);
  } catch (error) {
  //  console.error("❌ Failed to create order:", error.message);
    throw error;
  }
};

/**
 * Get PayPal Order Details (to check status before capturing)
 */
const getOrderDetails = async (orderID) => {
  try {
    const accessToken = await generateAccessToken();
    const url = `${base}/v2/checkout/orders/${orderID}`;

    const response = await fetch(url, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${accessToken}`,
      },
    });

    return handleResponse(response);
  } catch (error) {
    throw error;
  }
};

/**
 * Capture PayPal Order
 */
const captureOrder = async (orderID) => {
  try {
    const accessToken = await generateAccessToken();
    const url = `${base}/v2/checkout/orders/${orderID}/capture`;

    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${accessToken}`,
      },
    });

    return handleResponse(response);
  } catch (error) {
    throw error;
  }
};

/**
 * Handle API Response
 */
const handleResponse = async (response) => {
  try {
    const jsonResponse = await response.json();
    if (!response.ok) {
      throw new Error(`API Error: ${JSON.stringify(jsonResponse)}`);
    }
    return { jsonResponse, httpStatusCode: response.status };
  } catch (err) {
    throw err;
  }
};

/**
 * Route: Create Order
 */
router.post("/orders", async (req, res) => {
  try {
    const { cart } = req.body;

    const { jsonResponse, httpStatusCode } = await createOrder(cart);
    res.status(httpStatusCode).json(jsonResponse);
  } catch (error) {
    console.error("❌ Order creation failed:", error.message);
    res.status(500).json({ error: "Failed to create order." });
  }
});

/**
 * Route: Capture Order (with order status check)
 */
router.post("/orders/:orderID/capture", async (req, res) => {
  try {
    const { orderID } = req.params;
    // Fetch order details to check status
    const orderDetails = await getOrderDetails(orderID);
    if (orderDetails.jsonResponse.status !== "APPROVED") {
      return res
        .status(400)
        .json({ error: "Order is not approved for capture." });
    }

    // Capture the order
    const { jsonResponse, httpStatusCode } = await captureOrder(orderID);
    res.status(httpStatusCode).json(jsonResponse);
  } catch (error) {
   // console.error("❌ Order capture failed:", error.message);
    res.status(500).json({ error: "Failed to capture order." });
  }
});

/**
 * Serve Checkout Page
 */
router.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "../Front/public/checkout.html"));
});

module.exports = router;
