const express = require("express");
const dotenv = require("dotenv");
const cors = require("cors");
const cookieParser = require("cookie-parser");

// Import routes
const authRoutes = require("./Routes/authRoutes.js");
const AdminDashboard = require("./Routes/AdminDashboard.js");
const BookingRoute = require("./Routes/BookingRoute.js");
const serviceRoutes = require("./Routes/ServiceRoutes.js");
const MessageRoute = require("./Routes/MessageRoute.js");
const ProductsRoute = require("./Routes/ProductsRoute.js");
const EarningRoute = require("./Routes/EarningRoute.js");
const { createDefaultAdmin } = require("./Controllers/auth/adminAuth.js");

dotenv.config();

const app = express();

// ✅ 1. ALLOWED ORIGINS - Add localhost for testing
const allowedOrigins = [
  "https://deploy-dolt.netlify.app",
  "https://d0lt-getitdone-clone.onrender.com",
  "https://dolt-dashboard-clone.onrender.com",
  "http://localhost:3000",      // ✅ For local testing
  "http://localhost:3001",      // ✅ For local testing
];

// ✅ 2. MIDDLEWARE ORDER IS CRITICAL
// Parse cookies FIRST (before any routes)
app.use(cookieParser());

// Parse JSON SECOND
app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ extended: true, limit: "50mb" }));

// ✅ 3. CORS CONFIGURATION - Third
const corsOptions = {
  origin: (origin, callback) => {
    // ✅ Allow requests without origin (like mobile apps or curl)
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      console.warn(`❌ CORS blocked origin: ${origin}`);
      callback(new Error("CORS not allowed"));
    }
  },
  credentials: true, // ✅ CRITICAL: Allow credentials (cookies)
  methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"],
  optionsSuccessStatus: 200, // For older browsers
};

app.use(cors(corsOptions));

// ✅ 4. STATIC FILES after middleware
app.use("/uploads", express.static("uploads"));

// ✅ 5. HEALTH CHECK ROUTE
app.get("/", (req, res) => {
  res.json({ 
    message: "✅ Server is running",
    time: new Date().toISOString()
  });
});

// ✅ 6. DEBUG ENDPOINT - to verify cookies are being received
app.get("/api/debug/cookies", (req, res) => {
  console.log("🍪 Cookies received:", req.cookies);
  res.json({
    cookiesReceived: req.cookies,
    message: "Check console for cookie debug info"
  });
});

// ✅ 7. ROUTES
app.use("/api/auth", authRoutes);
app.use("/api/products", ProductsRoute);
app.use("/api/services", serviceRoutes);
app.use("/api/provider", EarningRoute);
app.use("/api/provider", BookingRoute);
app.use("/api/bookings", BookingRoute);
app.use("/api/user-counts", AdminDashboard);
app.use("/api/admin", AdminDashboard);
app.use("/api/messages", MessageRoute);

// ✅ 8. ERROR HANDLING for unmatched routes
app.use((req, res) => {
  res.status(404).json({ message: "Route not found" });
});

// ✅ 9. START SERVER
const PORT = process.env.PORT || 5000;
app.listen(PORT, "0.0.0.0", async () => {
  try {
    await createDefaultAdmin();
    console.log(`✅ Server running on port ${PORT}`);
    console.log(`📍 Allowed Origins: ${allowedOrigins.join(", ")}`);
  } catch (error) {
    console.error("❌ Error starting server:", error);
  }
});