const mongoose = require("mongoose");

const OrderItemSchema = new mongoose.Schema({
  productId: { type: String, required: true },
  name: { type: String, required: true },
  quantity: { type: Number, required: true },
  price: { type: String, required: true }, // Price per item at time of purchase
  image: { type: String }
});

const PaymentDetailsSchema = new mongoose.Schema({
  paymentId: { type: String, required: true }, // from Stripe/Paypal
  method: { type: String, enum: ['stripe', 'paypal'], required: true },
  status: { type: String, required: true }, // e.g., 'succeeded', 'completed'
  amount: { type: Number, required: true },
  currency: { type: String, default: 'usd' }
});

const OrderSchema = new mongoose.Schema({
  userId: { type: String, required: true }, // Refers to Homeowner ID
  items: [OrderItemSchema],
  totalAmount: { type: Number, required: true },
  status: {
    type: String,
    enum: ["Pending", "Processing", "Shipped", "Delivered", "Cancelled"],
    default: "Pending",
  },
  shippingAddress: {
    type: Object,
    required: true
  },
  paymentDetails: PaymentDetailsSchema,
  orderDate: { type: Date, default: Date.now },
}, { timestamps: true });

// This model is for structure reference as we are using Firestore.
// We export the schema structure for reference in controllers.
module.exports = OrderSchema;
