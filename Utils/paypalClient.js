const paypal = require("@paypal/checkout-server-sdk");
require("dotenv").config(); // make sure this is included

// Sandbox environment (use LiveEnvironment for production)
const Environment = paypal.core.SandboxEnvironment;
const paypalClient = new paypal.core.PayPalHttpClient(
  new Environment(
    process.env.PAYPAL_CLIENT_ID,     // your client ID
    process.env.PAYPAL_CLIENT_SECRET  // correct env variable name
  )
);

module.exports = paypalClient;
