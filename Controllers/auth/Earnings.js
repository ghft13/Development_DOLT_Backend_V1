const { db,admin }=require("../../config/firebase.js")

const SeeEarnings = async (req, res) => {
  try {
    const { providerId } = req.body;

    if (!providerId) {
      return res.status(400).json({ message: "Provider ID is required" });
    }

    const bookingsRef = db.collection("bookings");
    const snapshot = await bookingsRef
      .where("provider_id", "==", providerId)
      .where("status", "==", "completed")
      .get();

    const bookings = snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));

    // Total earnings
    const totalEarnings = bookings.reduce(
      (sum, b) => sum + (b.total_amount || 0),
      0
    );

    // Monthly earnings calculation
    const monthlyData = {};

    bookings.forEach((b) => {
      const date = b.completed_date || b.updated_at || null;
      if (!date) return;

      const d = new Date(date);
      const monthLabel = d.toLocaleString("en-US", { month: "short" }); // Jan, Feb, Mar
      const year = d.getFullYear(); // to avoid mixing years
      const key = `${monthLabel} ${year}`;

      if (!monthlyData[key]) monthlyData[key] = { month: key, earnings: 0, jobs: 0 };

      monthlyData[key].earnings += b.total_amount || 0;
      monthlyData[key].jobs += 1;
    });

    const monthlyArray = Object.values(monthlyData);

    return res.json({
      success: true,
      totalEarnings,
      completedJobs: bookings.length,
      monthlyData: monthlyArray,
      bookings,
    });

  } catch (error) {
    console.error("Error fetching earnings:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};




module.exports={SeeEarnings}