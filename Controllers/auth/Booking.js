const { db, admin } = require("../../Config/FireBase");

const createBooking = async (req, res) => {
  try {
    const {
      id,
      user_id,
      provider_id,
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

    // ✅ Validate required fields
    if (!user_id || !service_id || !scheduled_date || !address) {
      return res.status(400).json({ message: "All fields are required" });
    }

    // ✅ Create a new booking document
    const newDocRef = db.collection("bookings").doc(id || undefined); // use given id if provided

    const bookingData = {
      bookingId: newDocRef.id,
      user_id,
      provider_id: provider_id || null,
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
      isBooked: true,
      isCancelled: false,
    };

    // ✅ Store booking in Firestore
    await newDocRef.set(bookingData);

    // ✅ Add booking reference to the user document
    await db
      .collection("homeowners")
      .doc(user_id)
      .update({
        bookingIds: admin.firestore.FieldValue.arrayUnion(newDocRef.id),
      });

    res.status(201).json({
      message: "Booking created successfully",
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

    const snapshot = await bookingsRef.where("userId", "==", userId).get();

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
    const { providerId } = req.query;
    if (!providerId) {
      return res.status(400).json({
        success: false,
        message: "Provider ID is required",
      });
    }

    const providerRef = db.collection("serviceProviders").doc(providerId);
    const providerDoc = await providerRef.get();

    if (!providerDoc.exists) {
      return res.status(404).json({
        success: false,
        message: "Provider not found",
      });
    }

    const providerData = providerDoc.data();
    const providerProfessions = (providerData.professions || []).map(
      (profession) => profession.toLowerCase().trim()
    );
   
    const bookingIds = providerData.bookingIds || [];

    // Get bookings by bookingIds
    const bookedByProviderPromises = bookingIds.map((id) =>
      db.collection("bookings").doc(id).get()
    );
    const bookedByProviderDocs = await Promise.all(bookedByProviderPromises);

    const bookedByProvider = bookedByProviderDocs
      .filter((doc) => doc.exists)
      .map((doc) => ({ id: doc.id, ...doc.data() }));

    // Get all bookings to filter for available ones
    const bookingsSnapshot = await db.collection("bookings").get();

    const additionalBookings = bookingsSnapshot.docs
      .filter((doc) => {
        const data = doc.data();
        return (
          data.status === "pending" &&
          data.isBooked === false &&
          providerProfessions.includes(data.service.toLowerCase().trim()) && // 🔥 case-insensitive + trimmed match
          !bookingIds.includes(doc.id)
        );
      })
      .map((doc) => ({ id: doc.id, ...doc.data() }));

    const allRelevantBookings = [...bookedByProvider, ...additionalBookings];

    res.status(200).json({
      success: true,
      data: allRelevantBookings,
    });
  } catch (error) {
    console.error("Error fetching provider booking data:", error);
    res.status(500).json({
      success: false,
      message: "Error fetching booking data",
    });
  }
};

const UpdateBooking = async (req, res) => {
  const bookingId = req.params.id;
  const updatedData = req.body;

  try {
    const docRef = db.collection("bookings").doc(bookingId);
    const doc = await docRef.get();

    if (!doc.exists) {
      return res.status(404).json({ message: "Booking not found" });
    }

    // Handle declined
    if (updatedData.status === "declined") {
      updatedData.status = doc.data().status; // Retain original
      updatedData.isBooked = false;
    }
    // Handle Confirm
    else if (updatedData.status === "Confirmed") {
      updatedData.status = "Confirmed";
    }

    // Handle completed
    else if (updatedData.status === "completed") {
      updatedData.isBooked = false;
      // Earnings calculation and update
      const bookingData = doc.data();
      // Try to get providerId from providerDetails, serviceProviderId, or providerId
      const providerId = (bookingData.providerDetails && bookingData.providerDetails.id) || bookingData.serviceProviderId || bookingData.providerId;
      let serviceAmount = bookingData.serviceAmount;
      if (typeof serviceAmount !== "number" || isNaN(serviceAmount) || serviceAmount <= 0) {
        serviceAmount = 0;
      }
      // Prevent double increment: only add earning if not already set
      if (providerId && serviceAmount > 0 && !bookingData.providerEarning) {
        // Calculate earning and round to 2 decimals (e.g., 90% to provider)
        const earning = Math.round(serviceAmount * 0.9 * 100) / 100;
        const providerRef = db.collection("serviceProviders").doc(providerId);
        await providerRef.update({
          earnings: admin.firestore.FieldValue.increment(earning),
        });
        // Store earning in booking document for audit (write immediately)
        await docRef.update({ providerEarning: earning });
      }
    }

    // Handle accepted (provider assigned)
    else if (updatedData.providerDetails) {
      updatedData.isBooked = true;
      const providerId = updatedData.providerDetails.id;
      const userId = doc.data().userId;
      const providerRef = db.collection("serviceProviders").doc(providerId);

      // Increment total_Appointments
      await providerRef.update({
        bookingIds: admin.firestore.FieldValue.arrayUnion(bookingId),
        total_Appointments: admin.firestore.FieldValue.increment(1),
      });

      // Check if this user is a new client for this provider
      const providerDoc = await providerRef.get();
      const servedClients = providerDoc.data().servedClients || [];
      if (!servedClients.includes(userId)) {
        await providerRef.update({
          total_clients: admin.firestore.FieldValue.increment(1),
          servedClients: admin.firestore.FieldValue.arrayUnion(userId),
        });
      }
    }

    await docRef.update(updatedData);
    return res.status(200).json({ message: "Booking updated" });
  } catch (err) {
    console.error("Error in UpdateBooking:", err);
    return res
      .status(500)
      .json({ message: "Error updating booking", error: err.message });
  }
};

const CancelBooking = async (req, res) => {
  const { id } = req.params;

  try {
    const bookingRef = db.collection("bookings").doc(id);
    const bookingDoc = await bookingRef.get();

    if (!bookingDoc.exists) {
      return res.status(404).json({ message: "Booking not found" });
    }

    await bookingRef.update({
      status: "canceled",
      canceledAt: new Date().toISOString(), // optional: track when it was canceled
    });

    console.log("Booking canceled successfully:", id);
    res.status(200).json({ message: "Booking successfully canceled" });
  } catch (error) {
    console.error("Error canceling booking:", error);
    res.status(500).json({ message: "Internal Server Error" });
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
      return res.status(400).json({ message: "Can only rate completed bookings." });

    // Update booking with rating
    await bookingRef.update({ rating });

    // Update provider's average rating
    const providerRef = db.collection("serviceProviders").doc(providerId);
    const providerDoc = await providerRef.get();
    if (!providerDoc.exists) return res.status(404).json({ message: 'Provider not found.' });
    const providerData = providerDoc.data();
    const prevCount = providerData.ratingCount || 0;
    const prevAvg = providerData.averageRating || 0;
    const newCount = prevCount + 1;
    const newAvg = ((prevAvg * prevCount) + rating) / newCount;
    await providerRef.update({
      averageRating: newAvg,
      ratingCount: newCount,
      Rating: newAvg // Store the average in the 'Rating' field as well
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
      return res.status(400).json({ message: "Earning already added for this booking." });
    if (bookingData.status !== "completed")
      return res.status(400).json({ message: "Can only add earning for completed bookings." });

    // Update booking with earning
    await bookingRef.update({ providerEarning: earning });

    // Update provider's total earnings
    const providerRef = db.collection("serviceProviders").doc(providerId);
    const providerDoc = await providerRef.get();
    if (!providerDoc.exists) return res.status(404).json({ message: 'Provider not found.' });
    const providerData = providerDoc.data();
    const prevEarnings = providerData.earnings || 0;
    const newEarnings = prevEarnings + earning;
    await providerRef.update({
      earnings: newEarnings
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
