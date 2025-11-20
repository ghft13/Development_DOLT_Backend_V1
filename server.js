const express = require("express");
const dotenv = require("dotenv");
const cors = require("cors");
const authRoutes = require("./Routes/authRoutes.js");
const AdminDashboard = require("./Routes/AdminDashboard.js");
const BookingRoute = require("./Routes/BookingRoute.js");
const serviceRoutes = require("./Routes/ServiceRoutes.js");
const MessageRoute = require("./Routes/MessageRoute.js");
const { createDefaultAdmin } = require("./Controllers/auth/adminAuth.js");
const ProductsRoute = require("./Routes/ProductsRoute.js");
const EarningRoute = require("./Routes/EarningRoute.js");
dotenv.config();

// connectDB();
const app = express();
const allowedOrigins = [
  "https://deploy-dolt.netlify.app",
  "https://d0lt-getitdone-clone.onrender.com",
  "https://dolt-dashboard-clone.onrender.com",

];
  // "http://dashboard.d0lt.local:3001",
  // "http://main.d0lt.local:3000",
  // "http://localhost:3000"

const cookieParser = require("cookie-parser");

app.use(cookieParser()); // FIRST
app.use(express.json()); // SECOND

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
  res.send("hey Hello");
});


app.use("/api/auth", authRoutes);
app.use("/api/products", ProductsRoute);
app.use("/api/services", serviceRoutes);
app.use("/api/provider", EarningRoute);
app.use("/api/provider", BookingRoute);
app.use("/api/bookings", BookingRoute);
app.use("/api/user-counts", AdminDashboard);
app.use("/api/admin",AdminDashboard);
app.use("/api/messages",MessageRoute);


const PORT = process.env.PORT || 5000;
app.listen(PORT, "0.0.0.0",async () => {
  await createDefaultAdmin();
  console.log(`✅ Server running on port`);
});


