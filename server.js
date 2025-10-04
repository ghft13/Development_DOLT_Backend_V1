const express = require("express");
const dotenv = require("dotenv");
// const connectDB = require("./Config/Db.js");
const cors = require("cors");
const authRoutes = require("./Routes/authRoutes.js");
const AdminDashboard = require("./Routes/AdminDashboard.js");
const { authenticateAdmin } = require("./Middleware/Authmiddleware.js");
const { createDefaultAdmin } = require("./Controllers/auth/adminAuth.js");
const { SeedInitialServices } = require("./Controllers/auth/ServiceAuth.js");

const BookingRoute = require("./Routes/BookingRoute.js");
const nodemailer = require("nodemailer");
// const PayPalRoutes = require("./Controllers/auth/Paypal.js");
const PayPalRoutes = require("./Controllers/auth/Paypal.js");

const StripeRoutes = require("./Controllers/auth/Stripe.js");
const OrderRoute = require("./Routes/OrderRoute.js");
const MarketplaceRoute = require("./Routes/MarketplaceRoute.js");
const ImageUploadRoute = require("./Routes/ImageUploadRoute.js");
const UploadRoute = require("./Routes/UploadRoute");
const MarketplaceOrderRoute = require("./Routes/MarketplaceOrderRoute.js");
const serviceRoutes = require("./Routes/ServiceRoutes.js");
dotenv.config();

// connectDB();
const app = express();
const allowedOrigins = [
  "http://localhost:3000",
  "https://deploy-dolt.netlify.app",
  "https://www.sandbox.paypal.com",
  "https://www.paypal.com",
];

const cookieParser = require("cookie-parser");
app.use(cookieParser());

app.use(
  cors({
    origin: allowedOrigins,
    credentials: true, // Allow cookies if needed
  })
);

app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ extended: true, limit: "50mb" }));
app.use("/uploads", express.static("uploads"));

app.get("/", function (req, res) {
  res.send("hey");
});

app.use("/api/services", serviceRoutes);
app.use("/api/auth", authRoutes);
app.use("/api/user-counts", AdminDashboard);
app.get("/api/admin", authenticateAdmin, (req, res) => {
  res.json(req.admin);
});
app.use("/api/marketplace", MarketplaceRoute); // Changed from /api/bookings/marketplace
app.use("/api/bookings", BookingRoute);
app.use("/paypal", PayPalRoutes);
app.use("/api/stripe", StripeRoutes);
// app.use("/api/orders", OrderRoute);
// app.use("/api/upload", ImageUploadRoute); // Add image upload routes
// app.use("/api/upload", UploadRoute);
// app.use("/api/marketplace-orders", MarketplaceOrderRoute);

// app.use("/api/price",BookingRoute) // This is redundant. Routes from BookingRoute are served under /api/bookings.

const PORT = process.env.PORT || 5000;
app.listen(PORT, async () => {
  console.log(`server is running on port ${PORT}`);
  // await createDefaultAdmin();
  // await SeedInitialServices(); // <-- Seed services on startup
});

// Configure email transporter with improved error handling
// const transporter = nodemailer.createTransport({
//   service: "gmail", // or use a custom SMTP provider
//   auth: {
//     user: process.env.SMTP_USER, // Your email
//     pass: process.env.SMTP_PASS, // App password or SMTP password
//   },
// });

// Email sending endpoint with improved error handling
// app.post("/send-email", async (req, res) => {
//   const { name, email, message } = req.body;

//   if (!email) {
//     return res.status(400).json({ success: false, error: "Email address is required" });
//   }

//   const mailOptions = {
//     from: process.env.SMTP_USER,
//     to: process.env.RECIPIENT_EMAIL || process.env.SMTP_USER, // Send to a configured recipient or fallback to your own email
//     subject: `Contact Form Submission from ${name}`,
//     text: `Name: ${name}\nEmail: ${email}\nMessage: ${message}`,
//     replyTo: email
//   };

//   try {
//     // Test email configuration before sending
//     await transporter.verify();
//     await transporter.sendMail(mailOptions);
//     res.json({ success: true, message: "Email sent successfully!" });
//   } catch (error) {
//     console.error("Email sending error:", error);

//     // Send appropriate error message based on error type
//     if (error.code === 'EAUTH') {
//       return res.status(500).json({
//         success: false,
//         error: "Email authentication failed. Please check email credentials in server settings."
//       });
//     }

//     res.status(500).json({
//       success: false,
//       error: "Failed to send email. Please try again later or contact support."
//     });
//   }
// });

// app.get("/api/auth/user", (req, res) => {
//   res.json({ message: "Test user route is working" });
// });

// const adminDashboardRoutes = require('./Routes/AdminDashboard');
// app.use('/admin', adminDashboardRoutes);
