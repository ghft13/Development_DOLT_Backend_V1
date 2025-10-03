const { db, admin } = require("../Config/FireBase");
const stripe = require("stripe")(process.env.STRIPE_API_KEY);

const createOrder = async (req, res) => {
  const { sessionId, shippingAddress } = req.body;
  
  if (!sessionId) {
    return res.status(400).json({ message: "Stripe session ID is required" });
  }
  if (!shippingAddress) {
    return res.status(400).json({ message: "Shipping address is required" });
  }

  try {
    const session = await stripe.checkout.sessions.retrieve(sessionId);

    if (session.payment_status !== 'paid') {
      return res.status(400).json({ message: "Payment not successful for this session." });
    }

    // Check if order already exists for this session
    const ordersRef = db.collection('orders');
    const existingOrderSnapshot = await ordersRef.where('paymentDetails.paymentId', '==', session.id).get();
    if (!existingOrderSnapshot.empty) {
        return res.status(400).json({ message: 'Order already created for this session.' });
    }

    const metadata = session.metadata;
    const userId = metadata.userId;
    const cart = JSON.parse(metadata.cart);

    const lineItems = await stripe.checkout.sessions.listLineItems(sessionId);

    const orderItems = lineItems.data.map((item, index) => {
        const cartItem = cart.find(c => c.name === item.description);
        return {
            productId: cartItem.productId,
            name: item.description,
            quantity: item.quantity,
            price: (item.price.unit_amount / 100).toFixed(2) + '$',
            image: cartItem.image || ''
        };
    });

    const totalAmount = session.amount_total / 100;

    const newOrderRef = db.collection("orders").doc();
    const orderData = {
      orderId: newOrderRef.id,
      userId: userId,
      items: orderItems,
      totalAmount: totalAmount,
      status: "Processing",
      shippingAddress: shippingAddress,
      paymentDetails: {
        paymentId: session.id,
        method: 'stripe',
        status: session.payment_status,
        amount: totalAmount,
        currency: session.currency,
      },
      orderDate: admin.firestore.FieldValue.serverTimestamp(),
    };

    await newOrderRef.set(orderData);

    // Optionally, update user's orders array
    const userRef = db.collection("homeowners").doc(userId);
    await userRef.update({
      orderIds: admin.firestore.FieldValue.arrayUnion(newOrderRef.id),
    });

    res.status(201).json({
      message: "Order created successfully",
      order: orderData,
    });
  } catch (error) {
//    console.error("Error creating order:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

const getUserOrders = async (req, res) => {
    const { userId } = req.params;

    if (!userId) {
        return res.status(400).json({ message: "User ID is required" });
    }

    try {
        const ordersRef = db.collection('orders');
        const snapshot = await ordersRef.where('userId', '==', userId).get();

        // Always return 200 with array (empty if none)
        const orders = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

        res.status(200).json(orders);
    } catch (error) {
      //  console.error("Error fetching user orders:", error);
        res.status(500).json({ message: "Server error", error: error.message });
    }
};

module.exports = { createOrder, getUserOrders };
