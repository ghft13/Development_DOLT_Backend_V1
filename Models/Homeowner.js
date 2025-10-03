const mongoose = require("mongoose");
const HomeownerSchema = new mongoose.Schema({
  fullName: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  phone: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  role: { type: String, enum: ["user"], default: "user" },
  orderIds: [{ type: mongoose.Schema.Types.ObjectId, ref: "Order" }],
}, { timestamps: true });

const Homeowner= mongoose.model("Homeowner", HomeownerSchema);

module.exports = Homeowner;