const express = require("express");
const router = express.Router();
const stripe = require("stripe")(process.env.STRIPE_API_KEY);

const clientURL = process.env.DEPLOYED_CLIENT_URL || process.env.CLIENT_URL;

router.post("/create-checkout-session", async (req, res) => {
  const { service, price, type, cartSanitized } = req.body;
  let line_items = [];

  // If it's a product-type checkout
  if (type === "product" && Array.isArray(cartSanitized)) {
    line_items = cartSanitized.map((item) => {
      const cleanedPrice = item.price?.toString().replace(/[^0-9.]/g, "") || "0";
      const amount = Math.round(Number(cleanedPrice) * 100);

      return {
        price_data: {
          currency: "usd",
          product_data: {
            name: item.name || "Product",
          },
          unit_amount: amount,
        },
        quantity: item.quantity || 1,
      };
    });
  } else {
    // Service checkout
    if (!service) {
      return res.status(400).json({ status: "error", message: "Service name is required" });
    }
    if (!price) {
      return res.status(400).json({ status: "error", message: "Price is required" });
    }

    const cleanedPrice = price.toString().replace(/[^0-9.]/g, "");
    const numericPrice = Number(cleanedPrice);

    if (isNaN(numericPrice) || numericPrice <= 0) {
      return res.status(400).json({
        status: "error",
        message: "Invalid price format. Please provide a valid number.",
      });
    }

    const stripeAmount = Math.round(numericPrice * 100);

    line_items.push({
      price_data: {
        currency: "usd",
        product_data: {
          name: service,
          description: `Payment for ${service}`,
        },
        unit_amount: stripeAmount,
      },
      quantity: 1,
    });
  }

  // 👇 Set dynamic redirect URLs
  const successUrl =
    type === "product"
      ? `${clientURL}/payment-status?status=success&type=product`
      : `${clientURL}/payment-status?status=success`;

  const cancelUrl = `${clientURL}/payment-status?status=cancel`;

  try {
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ["card"],
      line_items,
      mode: "payment",
      success_url: successUrl,
      cancel_url: cancelUrl,
      metadata: {
        checkout_type: type || "service",
        service_name: service || "Product Order",
      },
    });

    return res.json({
      id: session.id,
      status: "success",
      message: "Checkout session created successfully",
    });
  } catch (error) {
   
    return res.status(500).json({
      status: "error",
      message: "Payment service unavailable. Please try again later.",
    });
  }
});

module.exports = router;
