const { db, admin } = require("../../Config/FireBase.js")

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



module.exports = {
  getUserConversations,
  getProviderConversations,
};