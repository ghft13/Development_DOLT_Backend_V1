// This file defined a Mongoose schema for Marketplace Products.
// As the application now exclusively uses Firebase Firestore for marketplace data,
// this model is no longer in use and can be safely deleted.
module.exports = {};
  price: { type: Number, required: true },
  description: { type: String, required: true },
  image: { type: String, required: true },
  category: { type: String },
  discount: { type: Number, default: 0 },
  rating: { type: Number, default: 0 },
  reviews: { type: Number, default: 0 },
  inStock: { type: Boolean, default: true },
  firestoreId: { type: String, unique: true, sparse: true, required: true } // To link with Firestore document
}, { timestamps: true });

const MarketplaceProduct = mongoose.model('MarketplaceProduct', MarketplaceProductSchema);

// This model is for structure reference as we are using Firestore.
// We export the schema structure for reference in controllers.
module.exports = MarketplaceProduct;
