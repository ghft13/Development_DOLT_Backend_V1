const { db, admin } = require("../../Config/FireBase");

const createBooking = async (req, res) => {
  try {
    const {
      id,
      user_id,
      service_id,
      status,
      scheduled_date,
      completed_date,
      address,
      latitude,
      longitude,
      notes,
      total_amount,
      currency,
      created_at,
      updated_at,
      service_title,
      service_description,
      user_name,
      user_email,
    } = req.body;
    console.log("Received booking data:", req.body);

    // ✅ Validate required fields
    if (!user_id || !service_id || !scheduled_date || !address) {
      return res.status(400).json({ message: "All fields are required" });
    }

    const bookingData = {
      user_id,
      service_id,
      status: status || "pending",
      scheduled_date,
      completed_date: completed_date || null,
      address,
      latitude: latitude || null,
      longitude: longitude || null,
      notes: notes || "",
      total_amount: total_amount || 0,
      currency: currency || "USD",
      created_at: created_at
        ? new Date(created_at)
        : admin.firestore.FieldValue.serverTimestamp(),
      updated_at: updated_at
        ? new Date(updated_at)
        : admin.firestore.FieldValue.serverTimestamp(),
      service_title,
      service_description,
      user_name,
      user_email,
      isBooked: false,
      isCancelled: false,
    };

    let newDocRef;

    if (id) {
      // ✅ If an ID is provided, use it
      newDocRef = db.collection("bookings").doc(id);
      await newDocRef.set({ ...bookingData, bookingId: id });
    } else {
      // ✅ If no ID, auto-generate one
      newDocRef = await db.collection("bookings").add(bookingData);
      bookingData.bookingId = newDocRef.id;
    }

    // ✅ Add booking reference to the user document
   

    res.status(201).json({
      message: "✅ Booking created successfully",
      booking: bookingData,
    });
  } catch (error) {
    console.error("Error creating booking:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

const getBookingdata = async (req, res) => {
  try {
    const { userId } = req.query; // ✅ fixed

    if (!userId) {
      return res.status(400).json({
        success: false,
        message: "User ID is required",
      });
    }

    const bookingsRef = db.collection("bookings");

    const snapshot = await bookingsRef.where("user_id", "==", userId).get();

    if (snapshot.empty) {
      return res.status(200).json({
        success: true,
        data: [],
      });
    }

    const bookings = snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));

    res.status(200).json({
      success: true,
      data: bookings,
    });
  } catch (error) {
    console.error("Error fetching booking data:", error);
    res.status(500).json({
      success: false,
      message: "Error fetching booking data",
    });
  }
};

const getProviderBookings = async (req, res) => {
  try {
    const { providerId } = req.query; // Get providerId from query params

    if (!providerId) {
      return res.status(400).json({
        success: false,
        message: "Provider ID is required",
      });
    }

    // Fetch ALL bookings
    const snapshot = await db.collection("bookings").get();

    if (snapshot.empty) {
      return res.status(200).json({
        success: true,
        count: 0,
        data: [],
      });
    }

    // Map and filter bookings
    const bookings = snapshot.docs
      .map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }))
      .filter((booking) => {
        // ❌ Skip cancelled bookings
        if (booking.isCancelled === true) {
          return false;
        }

        // ✅ Show booking if it's NOT booked yet (available for all providers)
        if (!booking.isBooked || booking.status === "pending") {
          return true;
        }

        // ✅ Show booking if it's booked by THIS provider
        if (booking.isBooked && booking.provider_id === providerId) {
          return true;
        }

        // ❌ Hide if booked by another provider
        return false;
      });

    res.status(200).json({
      success: true,
      count: bookings.length,
      data: bookings,
    });
  } catch (error) {
    console.error("❌ Error fetching provider bookings:", error);
    res.status(500).json({
      success: false,
      message: "Server error while fetching bookings",
    });
  }
};


const UpdateBooking = async (req, res) => {
  const bookingId = req.params.id;
  const updatedData = req.body;

  console.log("🔄 UpdateBooking called with ID:", bookingId);
  console.log("🔄 Update data:", updatedData);

  try {
    const docRef = db.collection("bookings").doc(bookingId);
    const doc = await docRef.get();

    if (!doc.exists) {
      return res.status(404).json({ message: "Booking not found" });
    }

    const bookingData = doc.data();

    // 🟢 Handle Accepted (Provider Assigned)
    if (updatedData.providerDetails) {
      const providerId = updatedData.providerDetails.provider_id;

      if (!providerId) {
        return res.status(400).json({ message: "Provider ID is missing" });
      }

      // ✅ Check if booking is already accepted by another provider
      if (bookingData.isBooked && bookingData.provider_id !== providerId) {
        return res.status(409).json({ 
          message: "This booking has already been accepted by another provider" 
        });
      }

      // Update local booking fields
      updatedData.isBooked = true;
      updatedData.status = "accepted";
      updatedData.provider_id = providerId; // store provider ID in booking
      updatedData.acceptedAt = new Date().toISOString();

      const providerRef = db.collection("serviceProviders").doc(providerId);
      const userRef = db.collection("users").doc(bookingData.user_id);

      await userRef.update({
        bookings: admin.firestore.FieldValue.arrayUnion(bookingId),
        providerMapping: admin.firestore.FieldValue.arrayUnion({
          bookingId: bookingId,
          providerId: providerId,
        }),
      });

      // Increment provider stats
      await providerRef.update({
        total_Appointments: admin.firestore.FieldValue.increment(1),
      });

      await providerRef.update({
        acceptedBookings: admin.firestore.FieldValue.arrayUnion(bookingId),
      });

      // Check if this user is a new client for the provider
      const providerDoc = await providerRef.get();
      const servedClients = providerDoc.data()?.servedClients || [];
      const userId = bookingData.user_id; // make sure matches your field name

      if (userId && !servedClients.includes(userId)) {
        await providerRef.update({
          total_clients: admin.firestore.FieldValue.increment(1),
          servedClients: admin.firestore.FieldValue.arrayUnion(userId),
        });
      }
    }

    // ✅ Update booking in Firestore safely (filter out undefineds)
    const cleanData = Object.fromEntries(
      Object.entries(updatedData).filter(([_, v]) => v !== undefined)
    );

    await docRef.update(cleanData);

    return res.status(200).json({ message: "Booking accepted successfully" });
  } catch (err) {
    console.error("❌ Error in UpdateBooking:", err);
    return res.status(500).json({
      message: "Error updating booking",
      error: err.message,
    });
  }
};

const CancelBooking = async (req, res) => {
  const { id } = req.params;

  try {
    const bookingRef = db.collection("bookings").doc(id);
    const bookingDoc = await bookingRef.get();

    if (!bookingDoc.exists) {
      return res
        .status(404)
        .json({ success: false, message: "Booking not found" });
    }

    await bookingRef.update({
      status: "cancelled", // ✅ use double “l”
      isCancelled: true, // ✅ useful for quick filters
      cancelledAt: new Date().toISOString(),
    });

    res
      .status(200)
      .json({ success: true, message: "Booking successfully cancelled" });
  } catch (error) {
    console.error("Error cancelling booking:", error);
    res.status(500).json({ success: false, message: "Internal Server Error" });
  }
};

const DeleteBooking = async (req, res) => {
  const { id } = req.params;
  try {
    const bookingRef = db.collection("bookings").doc(id);
    const bookingDoc = await bookingRef.get();
    if (!bookingDoc.exists) {
      return res.status(404).json({ message: "Booking not found" });
    }
    // Remove bookingId from user (homeowner or serviceProvider)
    const bookingData = bookingDoc.data();
    const userId = bookingData.userId;
    if (userId) {
      // Try both collections
      const homeownerRef = db.collection("homeowners").doc(userId);
      const homeownerDoc = await homeownerRef.get();
      if (homeownerDoc.exists) {
        await homeownerRef.update({
          bookingIds: admin.firestore.FieldValue.arrayRemove(id),
        });
      } else {
        const providerRef = db.collection("serviceProviders").doc(userId);
        const providerDoc = await providerRef.get();
        if (providerDoc.exists) {
          await providerRef.update({
            bookingIds: admin.firestore.FieldValue.arrayRemove(id),
          });
        }
      }
    }
    await bookingRef.delete();
    res.status(200).json({ message: "Booking deleted successfully" });
  } catch (error) {
    console.error("Error deleting booking:", error);
    res.status(500).json({ message: "Internal Server Error" });
  }
};

// Add a rating to a completed booking and update provider's average rating
const rateBooking = async (req, res) => {
  try {
    const { bookingId, providerId, rating } = req.body;
    if (!bookingId || !providerId || !rating) {
      return res.status(400).json({ message: "Missing required fields." });
    }
    if (rating < 1 || rating > 5) {
      return res.status(400).json({ message: "Rating must be 1-5." });
    }

    // Get booking
    const bookingRef = db.collection("bookings").doc(bookingId);
    const bookingDoc = await bookingRef.get();
    if (!bookingDoc.exists)
      return res.status(404).json({ message: "Booking not found." });
    const bookingData = bookingDoc.data();
    if (bookingData.rating)
      return res.status(400).json({ message: "Already rated." });
    if (bookingData.status !== "completed")
      return res
        .status(400)
        .json({ message: "Can only rate completed bookings." });

    // Update booking with rating
    await bookingRef.update({ rating });

    // Update provider's average rating
    const providerRef = db.collection("serviceProviders").doc(providerId);
    const providerDoc = await providerRef.get();
    if (!providerDoc.exists)
      return res.status(404).json({ message: "Provider not found." });
    const providerData = providerDoc.data();
    const prevCount = providerData.ratingCount || 0;
    const prevAvg = providerData.averageRating || 0;
    const newCount = prevCount + 1;
    const newAvg = (prevAvg * prevCount + rating) / newCount;
    await providerRef.update({
      averageRating: newAvg,
      ratingCount: newCount,
      Rating: newAvg, // Store the average in the 'Rating' field as well
    });
    res.json({ message: "Rating submitted." });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error." });
  }
};

// Add earning to a completed booking and update provider's total earnings
const addEarning = async (req, res) => {
  try {
    const { bookingId, providerId, earning } = req.body;
    if (!bookingId || !providerId || earning === undefined) {
      return res.status(400).json({ message: "Missing required fields." });
    }
    if (earning < 0) {
      return res.status(400).json({ message: "Earning must be >= 0." });
    }

    // Get booking
    const bookingRef = db.collection("bookings").doc(bookingId);
    const bookingDoc = await bookingRef.get();
    if (!bookingDoc.exists)
      return res.status(404).json({ message: "Booking not found." });
    const bookingData = bookingDoc.data();
    if (bookingData.providerEarning)
      return res
        .status(400)
        .json({ message: "Earning already added for this booking." });
    if (bookingData.status !== "completed")
      return res
        .status(400)
        .json({ message: "Can only add earning for completed bookings." });

    // Update booking with earning
    await bookingRef.update({ providerEarning: earning });

    // Update provider's total earnings
    const providerRef = db.collection("serviceProviders").doc(providerId);
    const providerDoc = await providerRef.get();
    if (!providerDoc.exists)
      return res.status(404).json({ message: "Provider not found." });
    const providerData = providerDoc.data();
    const prevEarnings = providerData.earnings || 0;
    const newEarnings = prevEarnings + earning;
    await providerRef.update({
      earnings: newEarnings,
    });
    res.json({ message: "Earning added and provider's total updated." });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error." });
  }
};

module.exports = {
  createBooking,
  getBookingdata,
  UpdateBooking,
  getProviderBookings,
  CancelBooking,
  DeleteBooking,
  rateBooking, // export new controller
  addEarning, // export new controller
};
