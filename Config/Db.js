// const mongoose = require("mongoose");
// require("dotenv").config();

// const connectDB = async () => {
//   try {
//     if (!process.env.MONGO_URI) {
//       console.error(
//         "MONGO_URI not set in environment variables. Skipping MongoDB connection."
//       );
//       return;
//     }
//     await mongoose.connect(process.env.MONGO_URI);
//     console.log("MongoDB Connected...");
//   } catch (err) {
//     console.error("MongoDB connection error:", err.message);
//     // Exit process with failure
//     process.exit(1);
//   }
// };

// module.exports = connectDB;