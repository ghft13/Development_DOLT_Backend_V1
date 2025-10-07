const paypal = require("@paypal/checkout-server-sdk");

const Environment = paypal.core.SandboxEnvironment;
const environment = new Environment(
  console.log("PAYPAL_CLIENT_ID:", process.env.PAYPAL_CLIENT_ID),
  console.log("PAYPAL_CLIENT_SECRET:", process.env.PAYPAL_CLIENT_SECRET),
  process.env.PAYPAL_CLIENT_ID,
  process.env.PAYPAL_CLIENT_SECRET
);

const paypalClient = new paypal.core.PayPalHttpClient(environment);

// Increase timeout from 10s to 30s
paypalClient._timeouts = { connect: 50000, socket: 50000 };

module.exports = paypalClient;
