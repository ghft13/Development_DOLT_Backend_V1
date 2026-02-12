const { db, admin } = require("../Config/FireBase.js")
const { sendNotification } = require("../NotificationController.js");

const getProviderConversations = async (req, res) => {
  try {
    const { userId } = req.query;

    if (!userId) {
      return res
        .status(400)
        .json({ success: false, message: "User ID is required" });
    }

    // 1️⃣ Get all bookings made by this user
    const bookingsSnapshot = await db
      .collection("bookings")
      .where("user_id", "==", userId)
      .get();

    if (bookingsSnapshot.empty) {
      return res.status(200).json({
        success: true,
        providers: [],
        message: "No bookings found for this user",
      });
    }

    // 2️⃣ Extract provider IDs and service titles from accepted/completed bookings
    const acceptedBookings = [];
    bookingsSnapshot.forEach((doc) => {
      const data = doc.data();
      if (data.status === "accepted" || data.status === "completed") {
        acceptedBookings.push({
          provider_id: data.provider_id,
          service_title: data.service_title || "Unknown Service",
        });
      }
    });

    if (acceptedBookings.length === 0) {
      return res.status(200).json({
        success: true,
        providers: [],
        message: "No accepted bookings yet",
      });
    }

    // 3️⃣ Remove duplicate providers
    const providerMap = new Map();
    acceptedBookings.forEach((b) => {
      if (!providerMap.has(b.provider_id)) {
        providerMap.set(b.provider_id, b.service_title);
      }
    });

    // 4️⃣ Fetch provider details from "serviceproviders" collection
    const providerDetails = [];
    for (const [providerId, serviceTitle] of providerMap.entries()) {
      const providerSnap = await db
        .collection("serviceProviders")
        .doc(providerId)
        .get();

      if (providerSnap.exists) {
        const providerData = providerSnap.data();
        providerDetails.push({
          id: providerId,
          name: providerData.fullName,
          email: providerData.email,
          avatar: providerData.avatar || "https://avatar.vercel.sh/provider",
          service_title: serviceTitle,
        });
      }
    }

    // 5️⃣ Return data
    return res.status(200).json({
      success: true,
      providers: providerDetails,
    });
  } catch (error) {
    console.error("Error fetching user conversations:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};


// controllers/messagesController.js
const getUserConversations = async (req, res) => {
  try {
    const { providerId } = req.query;

    if (!providerId) {
      return res.status(400).json({ success: false, message: "Provider ID is required" });
    }

    // Get all bookings assigned to this provider
    const bookingsSnapshot = await db
      .collection("bookings")
      .where("provider_id", "==", providerId)
      .get();

    if (bookingsSnapshot.empty) {
      return res.status(200).json({
        success: true,
        users: [],
        message: "No bookings found for this provider",
      });
    }

    const acceptedBookings = [];
    bookingsSnapshot.forEach((doc) => {
      const data = doc.data();
      if (data.status === "accepted" || data.status === "completed") {
        acceptedBookings.push({
          user_id: data.user_id,
          service_title: data.service_title || "Unknown Service",
        });
      }
    });

    const userMap = new Map();
    acceptedBookings.forEach((b) => {
      if (!userMap.has(b.user_id)) {
        userMap.set(b.user_id, b.service_title);
      }
    });

    const userDetails = [];
    for (const [userId, serviceTitle] of userMap.entries()) {
      const userSnap = await db.collection("users").doc(userId).get();
      if (userSnap.exists) {
        const userData = userSnap.data();
        userDetails.push({
          id: userId,
          name: userData.fullName,
          avatar: userData.avatar || "https://avatar.vercel.sh/user",
          email: userData.email,
          phone: userData.phone || null,
          service_title: serviceTitle,
        });
      }
    }

    return res.status(200).json({
      success: true,
      users: userDetails,
    });
  } catch (error) {
    console.error("Error fetching provider conversations:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};




const sendMessage = async (req, res) => {
  try {
    const { senderId, receiverId, content, senderName } = req.body;

    if (!senderId || !receiverId || !content) {
      return res.status(400).json({ success: false, message: "Missing required fields" });
    }

    // 1. Determine Conversation ID (consistent ID independent of who sends first)
    // sort IDs to ensure consistency: id1_id2
    const participants = [senderId, receiverId].sort();
    const conversationId = `${participants[0]}_${participants[1]}`;

    const conversationRef = db.collection("conversations").doc(conversationId);

    // 2. Save Message
    const messageData = {
      senderId,
      receiverId,
      content,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      read: false,
    };

    // 3. Update Conversation Metadata (Atomic batch or just separate writes)
    // using db.runTransaction ensures consistency but separate writes are fine here for speed

    const batch = db.batch();

    // Add message to subcollection
    const msgRef = conversationRef.collection("messages").doc();
    batch.set(msgRef, messageData);

    // Update conversation details
    batch.set(conversationRef, {
      participants,
      lastMessage: content,
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      [`unreadCount_${receiverId}`]: admin.firestore.FieldValue.increment(1),
      // We can store participant details loosely if needed, or rely on clients to fetch
    }, { merge: true });

    await batch.commit();

    // 4. Send Notification
    await sendNotification(receiverId, `New message from ${senderName || "User"}`, content, "message");

    res.status(200).json({ success: true, messageId: msgRef.id });

  } catch (error) {
    console.error("Error sending message:", error);
    res.status(500).json({ success: false, message: "Failed to send message" });
  }
};


module.exports = {
  getUserConversations,
  getProviderConversations,
  sendMessage,
};