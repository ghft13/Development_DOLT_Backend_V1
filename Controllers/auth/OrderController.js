const { db, admin } = require("../../Config/FireBase.js");

const createOrder = async (req, res) => {
    try {
        const {
            userid,
            username,
            details,
            items,
            total_amount,
            payment_id,
            payment_method,
            status
        } = req.body;

        if (!userid || !username || !details || !items || !total_amount) {
            return res.status(400).json({ message: "All fields are required" });
        }

        // 🛑 Prevent Self-Ordering
        for (const item of items) {
            if (item.providerId === userid) {
                return res.status(400).json({
                    message: `You cannot order your own product: ${item.name}`
                });
            }
        }

        // 1. Group items by providerId
        const ordersByProvider = {};

        items.forEach(item => {
            const pid = item.providerId || "unknown";
            if (!ordersByProvider[pid]) {
                ordersByProvider[pid] = {
                    items: [],
                    subTotal: 0
                };
            }
            ordersByProvider[pid].items.push(item);
            ordersByProvider[pid].subTotal += (item.price * item.quantity);
        });

        const createdOrderIds = [];

        // 2. Create an order for each provider
        const batch = db.batch();

        for (const [providerId, data] of Object.entries(ordersByProvider)) {
            const newDocRef = db.collection("orderBookings").doc();

            const orderData = {
                userid,
                username,
                details,
                items: data.items,
                total_amount: data.subTotal,
                payment_id: payment_id || null,
                payment_method: payment_method || "card",
                // ✅ Forcing isBooked to false so provider must manually "Accept" it.
                isBooked: false,
                providerId: providerId === "unknown" ? null : providerId,
                status: 'pending',
                created_at: admin.firestore.FieldValue.serverTimestamp(),
                updated_at: admin.firestore.FieldValue.serverTimestamp(),
                id: newDocRef.id
            };

            batch.set(newDocRef, orderData);
            createdOrderIds.push(newDocRef.id);
        }

        await batch.commit();

        // Update User's order list (optional)
        try {
            const userRef = db.collection("users").doc(userid);
            await userRef.update({
                orders: admin.firestore.FieldValue.arrayUnion(...createdOrderIds)
            });
        } catch (userError) {
            console.warn("Could not update user document with new order IDs:", userError);
        }

        res.status(201).json({
            success: true,
            message: `Orders created successfully (${createdOrderIds.length} split orders)`,
            orderIds: createdOrderIds
        });

    } catch (error) {
        console.error("Error creating order:", error);
        res.status(500).json({ message: "Server error", error: error.message });
    }
};

const getUserOrders = async (req, res) => {
    try {
        const { userId } = req.params;

        if (!userId) {
            return res.status(400).json({ message: "User ID is required" });
        }

        const ordersRef = db.collection("orderBookings");
        const snapshot = await ordersRef.where("userid", "==", userId).get();

        if (snapshot.empty) {
            return res.status(200).json({ success: true, data: [] });
        }

        const orders = snapshot.docs.map(doc => {
            const data = doc.data();
            // Convert Firestore timestamps to standard Date strings
            return {
                ...data,
                id: doc.id,
                created_at: data.created_at ? data.created_at.toDate() : null,
                updated_at: data.updated_at ? data.updated_at.toDate() : null,
            };
        }).sort((a, b) => {
            // Sort by created_at desc
            const dateA = a.created_at || new Date(0);
            const dateB = b.created_at || new Date(0);
            return dateB - dateA;
        });

        res.status(200).json({ success: true, data: orders });

    } catch (error) {
        console.error("Error fetching user orders:", error);
        res.status(500).json({ message: "Server error", error: error.message });
    }
};



const getProviderOrders = async (req, res) => {
    try {
        const { currentUserId } = req.query;

        const ordersRef = db.collection("orderBookings");
        const snapshot = await ordersRef.get();

        if (snapshot.empty) {
            return res.status(200).json({ success: true, data: [] });
        }

        let orders = snapshot.docs.map(doc => {
            const data = doc.data();
            return {
                ...data,
                id: doc.id,
                created_at: data.created_at ? data.created_at.toDate() : null,
                updated_at: data.updated_at ? data.updated_at.toDate() : null,
            };
        });

        if (currentUserId) {
            orders = orders.filter(order => {
                // 1. Remove own orders (orders I placed as a user)
                if (order.userid === currentUserId) return false;

                // 2. Targeted Orders (Product Orders)
                if (order.providerId) {
                    // Only show if it's assigned to ME
                    return order.providerId === currentUserId;
                }

                // 3. Open Logic (Service Requests) - No provider assigned yet
                // Show if available (not booked)
                if (!order.isBooked) return true;

                // Hide if booked by someone else
                return false;
            });
        } else {
            // Admin view: Enrich with provider details
            const providerIds = [...new Set(orders.map(o => o.providerId).filter(Boolean))];

            if (providerIds.length > 0) {
                const chunks = [];
                for (let i = 0; i < providerIds.length; i += 10) {
                    chunks.push(providerIds.slice(i, i + 10));
                }

                const providerMap = {};

                for (const chunk of chunks) {
                    // Check both serviceProviders and users collections because providers can be in either depending on registration
                    // But based on userAuth.js implementation, they should be in serviceProviders (or have an entry there)
                    // Let's try serviceProviders first
                    const providersRef = db.collection("serviceProviders");
                    const pSnap = await providersRef.where(admin.firestore.FieldPath.documentId(), 'in', chunk).get();

                    pSnap.docs.forEach(doc => {
                        providerMap[doc.id] = doc.data();
                    });

                    // Fallback check in users if not found (just in case of older data)
                    // (Optional optimization: only check for missing ones)
                }

                orders = orders.map(order => {
                    if (order.providerId && providerMap[order.providerId]) {
                        return {
                            ...order,
                            providerName: providerMap[order.providerId].fullName || providerMap[order.providerId].name || "Unknown",
                            providerEmail: providerMap[order.providerId].email
                        };
                    }
                    return order;
                });
            }
        }

        orders.sort((a, b) => {
            const dateA = a.created_at || new Date(0);
            const dateB = b.created_at || new Date(0);
            return dateB - dateA;
        });

        res.status(200).json({ success: true, data: orders });

    } catch (error) {
        console.error("Error fetching provider orders:", error);
        res.status(500).json({ message: "Server error", error: error.message });
    }
};

const acceptOrder = async (req, res) => {
    try {
        const { orderId, providerId } = req.body;


        if (!orderId || !providerId) {
            return res.status(400).json({ message: "Order ID and Provider ID are required" });
        }

        const orderRef = db.collection("orderBookings").doc(orderId);
        const providerRef = db.collection("serviceProviders").doc(providerId);

        // Use a transaction to ensure atomicity (prevent race conditions)
        await db.runTransaction(async (t) => {
            const doc = await t.get(orderRef);
            if (!doc.exists) {
                throw new Error("Order not found");
            }

            const data = doc.data();


            // 🟢 Modified Logic:
            // If already booked, check if it's assigned to THIS provider (Product Order case).
            // If assigned to ANOTHER provider, throw error.
            if (data.isBooked) {
                if (data.providerId !== providerId) {
                    throw new Error("This order has already been accepted by another provider");
                }
            }

            // Update order
            t.update(orderRef, {
                isBooked: true,
                providerId: providerId,
                status: 'accepted', // or 'processing'
                accepted_at: admin.firestore.FieldValue.serverTimestamp(),
                updated_at: admin.firestore.FieldValue.serverTimestamp()
            });

            // Update provider's accepted orders (separate from bookings)
            // Use set with merge to be safe if doc doesn't exist (though it should)
            t.set(providerRef, {
                acceptedOrders: admin.firestore.FieldValue.arrayUnion(orderId)
            }, { merge: true });
        });


        res.status(200).json({ success: true, message: "Order accepted successfully" });

    } catch (error) {
        console.error("Error accepting order:", error);
        if (error.message.includes("already been accepted") || error.message.includes("Order not found")) {
            return res.status(400).json({ message: error.message });
        }
        res.status(500).json({ message: "Server error", error: error.message });
    }
};

const updateOrderStatus = async (req, res) => {
    try {
        const { orderId, providerId, status } = req.body;

        if (!orderId || !providerId || !status) {
            return res.status(400).json({ message: "Order ID, Provider ID, and Status are required" });
        }

        const validStatuses = ["shipped", "delivered"];
        if (!validStatuses.includes(status)) {
            return res.status(400).json({ message: "Invalid status. Allowed: shipped, delivered" });
        }

        const orderRef = db.collection("orderBookings").doc(orderId);

        await db.runTransaction(async (t) => {
            const doc = await t.get(orderRef);
            if (!doc.exists) {
                throw new Error("Order not found");
            }

            const data = doc.data();

            // Verify provider owns this order
            if (data.providerId !== providerId) {
                throw new Error("Unauthorized: You are not the provider for this order");
            }

            const updates = {
                status: status,
                updated_at: admin.firestore.FieldValue.serverTimestamp()
            };

            if (status === "delivered") {
                updates.delivered_at = admin.firestore.FieldValue.serverTimestamp();
            }

            t.update(orderRef, updates);
        });

        res.status(200).json({ success: true, message: `Order status updated to ${status}` });

    } catch (error) {
        console.error("Error updating order status:", error);
        res.status(500).json({ message: error.message || "Server error" });
    }
};

module.exports = {
    createOrder,
    getUserOrders,
    getProviderOrders,
    acceptOrder,
    updateOrderStatus
}