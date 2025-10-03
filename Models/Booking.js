const mongoose = require("mongoose");

const bookingSchema = new mongoose.Schema({
  homeownerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: " Homeowner",
    required: true,
  }, 
  serviceProviderId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "ServiceProvider",
    required: true,
  }, 
  serviceId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Service",
    required: true,
  }, 
  bookingDate: { type: Date, default: Date.now }, 
  status: {
    type: String,
    enum: ["Pending", "Accepted", "Completed", "Rejected"],
    default: "Pending",
  },
  completedAt: { type: Date, default: null }, 
  rating: { type: Number, default: null }, // Add this line
});

const BookingModel = mongoose.model("Booking", bookingSchema);

module.exports = BookingModel;
