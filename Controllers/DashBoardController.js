const { db,admin }=require("../Config/FireBase.js")

const getUserCounts = async (req, res) => {
  try {
    // Fetch both collections in parallel
    const [homeownersSnap, serviceProvidersSnap] = await Promise.all([
      db.collection("users").get(),
      db.collection("serviceProviders").get(),
    ]);

    // Calculate counts
    const homeownerCount = homeownersSnap.size;
    const serviceProviderCount = serviceProvidersSnap.size;

    // Deduplicate using a common unique field (email or uid)
    const uniqueUsers = new Set();

    homeownersSnap.forEach((doc) => {
      const data = doc.data();
      if (data.email) uniqueUsers.add(data.email.toLowerCase());
    });

    serviceProvidersSnap.forEach((doc) => {
      const data = doc.data();
      if (data.email) uniqueUsers.add(data.email.toLowerCase());
    });

    const totalUniqueUsers = uniqueUsers.size;

    // Send structured response
    res.status(200).json({
      success: true,
      data: {
        homeownerCount,
        serviceProviderCount,
        totalUsers: totalUniqueUsers, // 👈 unique total
      },
    });
  } catch (error) {
    console.error("Error fetching user counts:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch user counts",
      error: error.message,
    });
  }
};


const getAllBookingsWithStatus = async (req, res) => {
  try {
    // Fetch all bookings in one go (most efficient)
    const bookingsSnapshot = await db.collection("bookings").get();

    // Initialize containers
    let acceptedBookings = [];
    let completedBookings = [];
    let cancelledBookings = [];
    let pendingBookings = [];

    let acceptedCount = 0;
    let completedCount = 0;
    let cancelledCount = 0;
    let pendingCount = 0;

    // Categorize each booking
    bookingsSnapshot.forEach((doc) => {
      const data = doc.data();
      const booking = { id: doc.id, ...data };

      if (data.status === "accepted") {
        acceptedBookings.push(booking);
        acceptedCount++;
      } else if (data.status === "completed") {
        completedBookings.push(booking);
        completedCount++;
      } else if (data.isCancelled === true || data.status === "cancelled") {
        cancelledBookings.push(booking);
        cancelledCount++;
      } else {
        // Treat everything else as pending or unconfirmed
        pendingBookings.push(booking);
        pendingCount++;
      }
    });

    // Send structured response
    res.json({
      success: true,
      totalBookings: bookingsSnapshot.size,
      acceptedCount,
      completedCount,
      cancelledCount,
      pendingCount,
      data: {
        accepted: acceptedBookings,
        completed: completedBookings,
        cancelled: cancelledBookings,
        pending: pendingBookings,
      },
    });
  } catch (err) {
    console.error("Error fetching bookings:", err);
    res.status(500).json({
      success: false,
      message: "Failed to fetch bookings",
      error: err.message,
    });
  }
};


const GetUserDetails = async (req, res) => {
  try {
   

    const homeownerSnapshot = await db.collection("users").get();

    const homeowners = homeownerSnapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
      address: doc.data().address || "",
      profilePic: doc.data().profilePic || "",
    }));

    res.json({
      success: true,
      data: homeowners,   // ✅ Only homeowners returned
    });

  } catch (err) {
    console.error("Error:", err);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

const GetServiceProviderDetails = async (req, res) => {
  try {

    const providerSnapshot = await db.collection("serviceProviders").get();

    const serviceProviders = providerSnapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
      address: doc.data().address || "",
      profilePic: doc.data().profilePic || "",
    }));

    res.json({
      success: true,
      data: serviceProviders,
    });

  } catch (err) {
    console.error("Error:", err);
    res.status(500).json({ success: false, message: "Server error" });
  }
};



// Delete user by ID (admin only)
// const DeleteUser = async (req, res) => {
//   const { id } = req.params;
//   try {
//     // Try homeowners first
//     let userRef = db.collection("homeowners").doc(id);
//     let userDoc = await userRef.get();
//     let collection = "homeowners";
//     if (!userDoc.exists) {
//       // Try serviceProviders
//       userRef = db.collection("serviceProviders").doc(id);
//       userDoc = await userRef.get();
//       collection = "serviceProviders";
//     }
//     if (!userDoc.exists) {
//       return res.status(404).json({ message: "User not found" });
//     }
//     await userRef.delete();
//     res.json({ success: true, message: `User deleted from ${collection}` });
//   } catch (err) {
//     res.status(500).json({ message: "Failed to delete user", error: err.message });
//   }
// };

// Suspend user by ID (admin only)
// const SuspendUser = async (req, res) => {
//   const { id } = req.params;
//   try {
//     // Try homeowners first
//     let userRef = db.collection("homeowners").doc(id);
//     let userDoc = await userRef.get();
//     let collection = "homeowners";
//     if (!userDoc.exists) {
//       // Try serviceProviders
//       userRef = db.collection("serviceProviders").doc(id);
//       userDoc = await userRef.get();
//       collection = "serviceProviders";
//     }
//     if (!userDoc.exists) {
//       return res.status(404).json({ message: "User not found" });
//     }
//     await userRef.update({ status: "suspended" });
//     res.json({ success: true, message: `User suspended in ${collection}` });
//   } catch (err) {
//     res.status(500).json({ message: "Failed to suspend user", error: err.message });
//   }
// };

// Update user credentials (admin only)
// const AdminUpdateUser = async (req, res) => {
//   const { id } = req.params;
//   const { name, email, mobnumber, address, profilePic, role, status } = req.body;
//   try {
//     // Try homeowners first
//     let userRef = db.collection("homeowners").doc(id);
//     let userDoc = await userRef.get();
//     let collection = "homeowners";
//     if (!userDoc.exists) {
//       // Try serviceProviders
//       userRef = db.collection("serviceProviders").doc(id);
//       userDoc = await userRef.get();
//       collection = "serviceProviders";
//     }
//     if (!userDoc.exists) {
//       return res.status(404).json({ message: "User not found" });
//     }
//     const updates = {};
//     if (name) updates.name = name;
//     if (typeof address !== "undefined") updates.address = address;
//     if (typeof profilePic !== "undefined") updates.profilePic = profilePic;
//     if (typeof mobnumber !== "undefined") updates.mobnumber = mobnumber;
//     if (collection === "homeowners" && typeof email !== "undefined") updates.email = email;
//     if (typeof status !== "undefined") updates.status = status; // Allow admin to update status

//     await userRef.update(updates);
//     const updatedDoc = await userRef.get();
//     const userData = updatedDoc.data();
//     delete userData.password;
//     res.json({ user: { id, ...userData } });
//   } catch (error) {
//     res.status(500).json({ message: "Failed to update user", error: error.message });
//   }
// };


module.exports = { getUserCounts, getAllBookingsWithStatus, GetUserDetails,GetServiceProviderDetails };
