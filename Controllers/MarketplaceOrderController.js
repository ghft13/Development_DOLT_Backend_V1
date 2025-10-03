const { db, admin } = require("../Config/FireBase");

// Create a new marketplace order after payment success
const createMarketplaceOrder = async (req, res) => {
  const { userId, items, totalAmount, shippingAddress, paymentDetails } = req.body;
  if (!userId || !items || !totalAmount || !shippingAddress || !paymentDetails) {
    return res.status(400).json({ message: "Missing required fields" });
  }
  try {
    const newOrderRef = db.collection("marketplaceOrders").doc();
    const orderData = {
      orderId: newOrderRef.id,
      userId,
      items,
      totalAmount,
      status: "Processing",
      shippingAddress: {
        name: shippingAddress.name || "",
        mobile: shippingAddress.mobile || "",
        address: shippingAddress.address || "",
        city: shippingAddress.city || "",
        state: shippingAddress.state || "",
        pincode: shippingAddress.pincode || ""
      },
      paymentDetails,
      orderDate: admin.firestore.FieldValue.serverTimestamp(),
    };
    await newOrderRef.set(orderData);
    // Optionally, update user's orders array
    const userRef = db.collection("homeowners").doc(userId);
    await userRef.update({
      orderIds: admin.firestore.FieldValue.arrayUnion(newOrderRef.id),
    });
    res.status(201).json({ message: "Marketplace order created successfully", order: orderData });
  } catch (error) {
 //   console.error("Error creating marketplace order:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// Get all marketplace orders for a user
const getUserMarketplaceOrders = async (req, res) => {
  const { userId } = req.params;
  if (!userId) {
    return res.status(400).json({ message: "User ID is required" });
  }
  try {
    const ordersRef = db.collection('marketplaceOrders');
    const snapshot = await ordersRef.where('userId', '==', userId).get();
    const orders = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    res.status(200).json(orders);
  } catch (error) {
    console.error("Error fetching user marketplace orders:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// Get all marketplace orders (admin)
const getAllMarketplaceOrders = async (req, res) => {
  try {
    const ordersRef = db.collection('marketplaceOrders');
    const snapshot = await ordersRef.get();
    const orders = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    res.status(200).json(orders);
  } catch (error) {
    console.error("Error fetching all marketplace orders:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

module.exports = {
  createMarketplaceOrder,
  getUserMarketplaceOrders,
  getAllMarketplaceOrders
}; 