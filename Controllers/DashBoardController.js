const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const ServiceProvider = require("../Models/ServiceProvider");
const Homeowner = require("../Models/Homeowner");
const Admin = require("../Models/Admin");
const { db } = require("../Config/FireBase");

const getdata = async (req, res) => {
  try {
    // Get counts from Firestore collections
    const homeownerSnapshot = await db.collection("homeowners").get();
    const serviceProviderSnapshot = await db
      .collection("serviceProviders")
      .get();

    const adminSnapshot = await db.collection("admins").get();

    const homeownerCount = homeownerSnapshot.size;
    const serviceProviderCount = serviceProviderSnapshot.size;
    const adminCount = adminSnapshot.size;

    res.json({
      homeownerCount,
      serviceProviderCount,
      adminCount,
      totalUsers: homeownerCount + serviceProviderCount,
    });
  } catch (err) {
   
    res.status(500).json({ message: "Server error" });
  }
};

const GetTotalBookings = async (req, res) => {
  try {
    // Get all bookings from Firestore collection
    const bookingsSnapshot = await db.collection("bookings").get();

    const totalBookings = bookingsSnapshot.size;

    // Count completed bookings and collect all booking details
    let completedBookings = 0;
    let pendingBookings = 0;
    const allBookings = [];

    bookingsSnapshot.forEach((doc) => {
      const data = doc.data();

      const bookingWithId = { id: doc.id, ...data };
      allBookings.push(bookingWithId);

      if (data.status && data.status.toLowerCase() === "completed") {
        completedBookings++;
      } else if (data.status && data.status.toLowerCase() === "pending") {
        pendingBookings++;
      }
    });

    res.json({
      totalBookings,
      completedBookings,
      pendingBookings,
      allBookings,  
    });
  } catch (err) {
    
    res.status(500).json({ message: "Server error" });
  }
};

const GetUserDetails = async (req, res) => {
  try {
    // Fetch documents from Firestore
    const homeownerSnapshot = await db.collection("homeowners").get();
    const serviceProviderSnapshot = await db
      .collection("serviceProviders")
      .get();

    // Convert snapshots to array of user objects
    const homeowners = homeownerSnapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
       address: doc.data().address || "",
      profilePic: doc.data().profilePic || "",
    }));
    const serviceProviders = serviceProviderSnapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
      address: doc.data().address || "",
      profilePic: doc.data().profilePic || "",
    }));
    const allUsers = [...homeowners, ...serviceProviders];
    // Send the data
    res.json({
      homeowners,
      serviceProviders,
      allUsers,
    });
  } catch (err) {
    
    res.status(500).json({ message: "Server error" });
  }
};

// Delete user by ID (admin only)
const DeleteUser = async (req, res) => {
  const { id } = req.params;
  try {
    // Try homeowners first
    let userRef = db.collection("homeowners").doc(id);
    let userDoc = await userRef.get();
    let collection = "homeowners";
    if (!userDoc.exists) {
      // Try serviceProviders
      userRef = db.collection("serviceProviders").doc(id);
      userDoc = await userRef.get();
      collection = "serviceProviders";
    }
    if (!userDoc.exists) {
      return res.status(404).json({ message: "User not found" });
    }
    await userRef.delete();
    res.json({ success: true, message: `User deleted from ${collection}` });
  } catch (err) {
    res.status(500).json({ message: "Failed to delete user", error: err.message });
  }
};

// Suspend user by ID (admin only)
const SuspendUser = async (req, res) => {
  const { id } = req.params;
  try {
    // Try homeowners first
    let userRef = db.collection("homeowners").doc(id);
    let userDoc = await userRef.get();
    let collection = "homeowners";
    if (!userDoc.exists) {
      // Try serviceProviders
      userRef = db.collection("serviceProviders").doc(id);
      userDoc = await userRef.get();
      collection = "serviceProviders";
    }
    if (!userDoc.exists) {
      return res.status(404).json({ message: "User not found" });
    }
    await userRef.update({ status: "suspended" });
    res.json({ success: true, message: `User suspended in ${collection}` });
  } catch (err) {
    res.status(500).json({ message: "Failed to suspend user", error: err.message });
  }
};

// Update user credentials (admin only)
const AdminUpdateUser = async (req, res) => {
  const { id } = req.params;
  const { name, email, mobnumber, address, profilePic, role, status } = req.body;
  try {
    // Try homeowners first
    let userRef = db.collection("homeowners").doc(id);
    let userDoc = await userRef.get();
    let collection = "homeowners";
    if (!userDoc.exists) {
      // Try serviceProviders
      userRef = db.collection("serviceProviders").doc(id);
      userDoc = await userRef.get();
      collection = "serviceProviders";
    }
    if (!userDoc.exists) {
      return res.status(404).json({ message: "User not found" });
    }
    const updates = {};
    if (name) updates.name = name;
    if (typeof address !== "undefined") updates.address = address;
    if (typeof profilePic !== "undefined") updates.profilePic = profilePic;
    if (typeof mobnumber !== "undefined") updates.mobnumber = mobnumber;
    if (collection === "homeowners" && typeof email !== "undefined") updates.email = email;
    if (typeof status !== "undefined") updates.status = status; // Allow admin to update status

    await userRef.update(updates);
    const updatedDoc = await userRef.get();
    const userData = updatedDoc.data();
    delete userData.password;
    res.json({ user: { id, ...userData } });
  } catch (error) {
    res.status(500).json({ message: "Failed to update user", error: error.message });
  }
};

// const getdata=async(req,res)=>{
//     try{
//         const homeownerCount=await Homeowner.countDocuments()
//         const serviceProviderCount=await ServiceProvider.countDocuments()
//         const adminCount=await Admin.countDocuments()

//         res.json({ homeownerCount,serviceProviderCount,adminCount,totaluser:homeownerCount+serviceProviderCount})
//     }

//     catch(err){
//         res.status(500).json({message:"Server error"})
//     }
// }

module.exports = { getdata, GetTotalBookings, GetUserDetails, DeleteUser, AdminUpdateUser, SuspendUser };
