const mongoose = require("mongoose");

const ServiceProviderSchema = new mongoose.Schema(
  {
    fullName: { type: String, required: true, trim: true },

    email: { type: String, required: true, unique: true, lowercase: true },

    password: { type: String, required: true },

    phone: { type: String, required: true, unique: true },

    role: { type: String, enum: ["provider"], default: "provider" },

    
    // Business stats
    totalClients: { type: Number, default: 0 },
    totalAppointments: { type: Number, default: 0 },
    earnings: { type: Number, default: 0 },

    // Ratings
    ratings: [{ type: Number }], // store all ratings to calculate average
    ratingCount: { type: Number, default: 0 },
    averageRating: { type: Number, default: 0 },

    // Profile info
    address: { type: String, default: "" },
    profilePic: { type: String, default: "" },
    professions: [{ type: String }],


  },
  { timestamps: true }
);



const ServiceProvider = mongoose.model("ServiceProvider", ServiceProviderSchema);

module.exports = ServiceProvider;
