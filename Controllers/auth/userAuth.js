const bcrypt = require("bcryptjs");
const { generateTokens } = require("./tokenUtils");
const { db, admin } = require("../../Config/FireBase.js");
const { verifyRefreshToken } = require("./tokenUtils");

const registerNewUser = async (req, res) => {
  const { fullName, email, password, phone, role } = req.body;

  try {
    if (!fullName || !email || !password || !phone || !role) {
      return res.status(400).json({ message: "All fields are required" });
    }

    if (!["user", "provider"].includes(role)) {
      return res.status(400).json({ message: "Invalid role" });
    }

    const userCollection = role === "user" ? "users" : "serviceProviders";
    const otherCollection = role === "user" ? "serviceProviders" : "users";

    const userRef = db.collection(userCollection);
    const otherRef = db.collection(otherCollection);

    const checks = await Promise.all([
      userRef.where("email", "==", email).get(),
      userRef.where("phone", "==", phone).get(),
      otherRef.where("email", "==", email).get(),
      otherRef.where("phone", "==", phone).get(),
    ]);

    if (checks.some((snap) => !snap.empty)) {
      return res
        .status(400)
        .json({ message: "Email or phone number already exists" });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    // ✅ Pre-generate document ID
    const newDocRef = db.collection(userCollection).doc();
    const userId = newDocRef.id;

    // ✅ Base data
    let newUserData = {
      id: userId,
      fullName,
      email,
      phone,
      password: hashedPassword,
      role,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      isAlsoProvider: false,
      isAlsoUser: false,
    };

    if (role === "provider") {
      newUserData.isAlsoProvider = true;
      newUserData.totalClients = 0;
      newUserData.totalAppointments = 0;
      newUserData.earnings = 0;
      newUserData.ratings = [];
      newUserData.ratingCount = 0;
      newUserData.averageRating = 0;
      newUserData.professions = [];
      newUserData.acceptedBookings = [];

      // ✅ FIXED: Must be inside newUserData
      newUserData.hourlyRate = 0;
      newUserData.skills = [];
      newUserData.serviceAreas = [];
      newUserData.avatar = "";
    }

    // ✅ Role-based fields
    if (role === "user") {
      newUserData.isAlsoUser = true;
      newUserData.bookings = [];
      newUserData.orderIds = [];
    } else {
      newUserData.isAlsoProvider = true;
      newUserData.totalClients = 0;
      newUserData.totalAppointments = 0;
      newUserData.earnings = 0;
      newUserData.ratings = [];
      newUserData.ratingCount = 0;
      newUserData.averageRating = 0;
      newUserData.professions = [];
      newUserData.acceptedBookings = [];
    }

    // ✅ Save to Firestore (users OR serviceProviders)
    await newDocRef.set(newUserData);

    // ✅ (Optional) mirror entry in other collection (if needed later)
    // await db.collection(otherCollection).doc(userId).set({ id: userId, linkedRole: role });

    const { token, refreshToken } = generateTokens(userId, role);

    // res.cookie("refreshToken", refreshToken, {
    //   httpOnly: true,
    //   secure: true, // use true in production
    //   sameSite: "lax",

    //   path: "/",
    //   maxAge: 7 * 24 * 60 * 60 * 1000,
    // });

    //     res.cookie("refreshToken", refreshToken, {
    //   httpOnly: true,
    //   secure: true, // ❗ must be false on localhost
    //   sameSite: "none", // or "none" if using different ports or domains
    //   path: "/",
    //   maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    // });

    res.cookie("refreshToken", refreshToken, {
      httpOnly: true,
      secure: true,
      sameSite: "None", // 🔥 this makes it FIRST-PARTY
      domain: ".onrender.com", // 🔥 shared across all your render subdomains
      path: "/",
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });

    return res.status(201).json({
      message: "User registered successfully",
      user: {
        id: userId,
        ...newUserData,
        password: undefined,
      },
      token,
      role,
    });
  } catch (error) {
    console.error("Registration error:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// ✅ controllers/authController.js
const loginUserAccount = async (req, res) => {
  const { email, password, role } = req.body;

  try {
    // Validate required fields
    if (!email || !password || !role) {
      return res
        .status(400)
        .json({ message: "Email, password and role are required" });
    }

    let userDoc = null;
    let userData = null;

    // Find user based on role
    if (role === "user") {
      const snap = await db
        .collection("users")
        .where("email", "==", email)
        .get();
      if (!snap.empty) {
        userDoc = snap.docs[0];
        userData = userDoc.data();
      }
    } else if (role === "provider") {
      const snap = await db
        .collection("serviceProviders")
        .where("email", "==", email)
        .get();
      if (!snap.empty) {
        userDoc = snap.docs[0];
        userData = userDoc.data();
      }
    } else if (role === "admin") {
      const snap = await db
        .collection("admins")
        .where("email", "==", email)
        .get();
      if (!snap.empty) {
        userDoc = snap.docs[0];
        userData = userDoc.data();
      }
    } else {
      return res.status(400).json({ message: "Invalid role provided" });
    }

    // No user found
    if (!userDoc) {
      return res
        .status(404)
        .json({ message: "User not found for given email and role" });
    }

    // 🔐 Check password
    const isMatch = await bcrypt.compare(password, userData.password);
    if (!isMatch) {
      return res.status(401).json({ message: "Incorrect password" });
    }

    // Generate tokens
    const { token, refreshToken } = generateTokens(userDoc.id, role);

    // Safe user data (no password)
    const userSafe = {
      id: userDoc.id,
      fullName: userData.fullName || "",
      email: userData.email,
      phone: userData.phone || "",
      role,
    };

    res.cookie("refreshToken", refreshToken, {
      httpOnly: true,
      secure: true,
      sameSite: "none", // 🔥 this makes it FIRST-PARTY
      domain: ".onrender.com", // 🔥 shared across all your render subdomains
      path: "/",
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });

    //     res.cookie("refreshToken", refreshToken, {
    //   httpOnly: true,
    //  secure: true,
    // sameSite: "none",
    //   path: "/",
    //   maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    // });

    return res.status(200).json({
      message: "Login successful",
      user: userSafe,
      token,
    });
  } catch (error) {
    console.error("Login error:", error);
    return res
      .status(500)
      .json({ message: "Server error", error: error.message });
  }
};

const logout = async (req, res) => {
  res.clearCookie("refreshToken", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "Strict",
    path: "/", // Add this if you had it implicitly in set-cookie
  });

  res.json({ success: true, message: "Logged out successfully" });
};

const BecomeProvider = async (req, res) => {
  try {
    const { userId } = req.body;

    if (!userId) {
      return res
        .status(400)
        .json({ success: false, message: "User ID is required" });
    }

    const userRef = db.collection("users").doc(userId);
    const userSnap = await userRef.get();

    if (!userSnap.exists) {
      return res
        .status(404)
        .json({ success: false, message: "User not found" });
    }

    const userData = userSnap.data();
    const { fullName, email, phone, password } = userData; // only essentials

    const providerRef = db.collection("serviceProviders").doc(userId);
    const providerSnap = await providerRef.get();

    // ✅ Create provider entry if not exists
    if (!providerSnap.exists) {
      await providerRef.set({
        id: userId,
        fullName,
        email,
        phone,
        password,
        role: "provider",
        isAlsoUser: true,
        isAlsoProvider: true,
        totalClients: 0,
        totalAppointments: 0,
        earnings: 0,
        ratings: [],
        ratingCount: 0,
        averageRating: 0,
        professions: [],
        acceptedBookings: [],
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
      });
    } else {
      await providerRef.update({
        fullName,
        email,
        phone,
        // role: "provider",
        isAlsoUser: true,
      });
    }

    // ✅ Mark user document as also provider
    await userRef.update({ isAlsoProvider: true });

    return res.json({
      success: true,
      message: "User is now also a provider!",
    });
  } catch (err) {
    console.error("❌ Become Provider Error:", err);
    return res
      .status(500)
      .json({ success: false, message: "Internal Server Error" });
  }
};

const BecomeUser = async (req, res) => {
  try {
    const { userId } = req.body;

    if (!userId) {
      return res
        .status(400)
        .json({ success: false, message: "User ID is required" });
    }

    const providerRef = db.collection("serviceProviders").doc(userId);
    const providerSnap = await providerRef.get();

    if (!providerSnap.exists) {
      return res
        .status(404)
        .json({ success: false, message: "Provider not found" });
    }

    const providerData = providerSnap.data();
    const { fullName, email, phone, password } = providerData; // only essentials

    const userRef = db.collection("users").doc(userId);
    const userSnap = await userRef.get();

    // ✅ Create user entry if not exists
    if (!userSnap.exists) {
      await userRef.set({
        id: userId,
        fullName,
        email,
        password,
        phone,
        role: "user",
        isAlsoProvider: true,
        isAlsoUser: true,
        bookings: [],
        orderIds: [],
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
      });
    } else {
      await userRef.update({
        fullName,
        email,
        phone,
        // role: "user",
        isAlsoProvider: true,
      });
    }

    // ✅ Mark provider document as also user
    await providerRef.update({ isAlsoUser: true });

    return res.json({
      success: true,
      message: "Provider is now also a user!",
    });
  } catch (err) {
    console.error("❌ Become User Error:", err);
    return res
      .status(500)
      .json({ success: false, message: "Internal Server Error" });
  }
};

const switchRole = async (req, res) => {
  try {
    const { userId, newRole } = req.body;

    if (!userId || !newRole) {
      return res
        .status(400)
        .json({ success: false, message: "User ID and new role are required" });
    }

    const userRef = db.collection("users").doc(userId);
    const userDoc = await userRef.get();

    if (!userDoc.exists) {
      return res
        .status(404)
        .json({ success: false, message: "User not found" });
    }

    await userRef.update({ role: newRole });

    return res.status(200).json({
      success: true,
      message: `Role switched to ${newRole}`,
      updatedRole: newRole,
    });
  } catch (error) {
    console.error("Error switching role:", error);
    res
      .status(500)
      .json({ success: false, message: "Server error", error: error.message });
  }
};
const VerifyUser = async (req, res) => {
  const refreshToken = req.cookies.refreshToken;

  if (!refreshToken) {
    return res
      .status(401)
      .json({ message: "Not authenticated — token unavailable" });
  }

  try {
    const userData = verifyRefreshToken(refreshToken);
    if (!userData || !userData.id) {
      return res.status(401).json({ message: "Invalid token" });
    }

    const userRef = db.collection("users").doc(userData.id);
    const providerRef = db.collection("serviceProviders").doc(userData.id);
    const adminRef = db.collection("admins").doc(userData.id);

    const [userSnap, providerSnap, adminSnap] = await Promise.all([
      userRef.get(),
      providerRef.get(),
      adminRef.get(),
    ]);

    let doc = null;

    if (userData.role === "admin") {
      if (adminSnap.exists) {
        doc = adminSnap.data();
      } else {
      }
    } else if (userData.role === "provider") {
      if (providerSnap.exists) {
        doc = providerSnap.data();
      } else {
      }
    } else if (userData.role === "user") {
      if (userSnap.exists) {
        doc = userSnap.data();
      } else {
      }
    }

    // 🛑 Fallback search if no match by priority
    if (!doc) {
      if (userSnap.exists) {
        doc = userSnap.data();
      } else if (providerSnap.exists) {
        doc = providerSnap.data();
      } else if (adminSnap.exists) {
        doc = adminSnap.data();
      } else {
        return res.status(404).json({ message: "User not found" });
      }
    }

    return res.json({
      user: {
        id: userData.id,
        email: doc.email,
        fullName: doc.fullName || doc.name || "Admin",
        role: doc.role,
        isAlsoUser: doc.isAlsoUser ?? false,
        isAlsoProvider: doc.isAlsoProvider ?? false,
      },
    });
  } catch (err) {
    return res.status(401).json({ message: "Invalid token" });
  }
};

const getLoggedInProviderData = async (req, res) => {
  const refreshToken = req.cookies.refreshToken;

  if (!refreshToken) {
    return res.status(401).json({ message: "Not authenticated — no token" });
  }

  try {
    const userData = verifyRefreshToken(refreshToken);

    if (!userData || !userData.id) {
      return res.status(401).json({ message: "Invalid token" });
    }

    const id = userData.id;

    const userRef = db.collection("users").doc(id);
    const providerRef = db.collection("serviceProviders").doc(id);
    const adminRef = db.collection("admins").doc(id);

    const [userSnap, providerSnap, adminSnap] = await Promise.all([
      userRef.get(),
      providerRef.get(),
      adminRef.get(),
    ]);

    let data = null;

    // First try by role
    if (userData.role === "admin" && adminSnap.exists) data = adminSnap.data();
    if (userData.role === "provider" && providerSnap.exists)
      data = providerSnap.data();
    if (userData.role === "user" && userSnap.exists) data = userSnap.data();

    // Fallback
    if (!data) {
      if (userSnap.exists) data = userSnap.data();
      else if (providerSnap.exists) data = providerSnap.data();
      else if (adminSnap.exists) data = adminSnap.data();
      else return res.status(404).json({ message: "User not found" });
    }

    // Count completed bookings
    const bookingsRef = db.collection("bookings");
    const completedBookingsQuery = await bookingsRef
      .where("provider_id", "==", id)
      .where("status", "==", "completed")
      .get();

    const completedBookingsCount = completedBookingsQuery.size;

    let totalEarnings = 0;
    completedBookingsQuery.forEach((doc) => {
      const booking = doc.data();
      totalEarnings += booking.total_amount || 0;
    });

    // ✅ Return the updated structure with all provider fields accessible
    return res.json({
      id,
      role: data.role,
      name: data.fullName || data.name || "No Name",
      email: data.email,
      phone: data.phone || null,
      address: data.address || null,
      createdAt: data.createdAt || null,
      membership: data.membership || null,
      isAlsoUser: data.isAlsoUser ?? false,
      isAlsoProvider: data.isAlsoProvider ?? false,
      completedBookings: completedBookingsCount,
      totalEarnings: totalEarnings,

      // ✅ Include these at top level for easy access
      avatar: data.avatar || "",
      hourlyRate: data.hourlyRate || 0,
      skills: data.skills || [],
      serviceAreas: data.serviceAreas || [],

      extra: data, // original firestore document
    });
  } catch (err) {
    console.error("❌ Error fetching logged-in user:", err);
    return res.status(401).json({ message: "Invalid token" });
  }
};

const updateProviderProfile = async (req, res) => {
  try {
    const userId = req.body.userId;

    if (!userId) {
      return res.status(401).json({ message: "Unauthorized user" });
    }

    const { name, email, avatar, hourlyRate, skills, serviceAreas } = req.body;

    const providerRef = db.collection("serviceProviders").doc(userId);
    const providerSnap = await providerRef.get();

    if (!providerSnap.exists) {
      return res.status(404).json({ message: "Provider profile not found" });
    }

    const updates = {};

    if (name) updates.fullName = name;
    if (email) updates.email = email;
    if (avatar !== undefined) updates.avatar = avatar;
    if (hourlyRate !== undefined) updates.hourlyRate = hourlyRate;

    if (skills !== undefined) {
      if (!Array.isArray(skills)) {
        return res.status(400).json({ message: "Skills must be an array" });
      }
      updates.skills = skills;
    }

    if (serviceAreas !== undefined) {
      if (!Array.isArray(serviceAreas)) {
        return res
          .status(400)
          .json({ message: "Service areas must be an array" });
      }
      updates.serviceAreas = serviceAreas;
    }

    await providerRef.update(updates);

    return res.json({
      message: "Profile updated successfully",
      updated: updates,
    });
  } catch (error) {
    console.error("Profile Update Error:", error);
    return res.status(500).json({ message: "Something went wrong" });
  }
};

const logoutUser = (req, res) => {
  res.clearCookie("refreshToken", {
    httpOnly: true,
    secure: false, // true in prod
    sameSite: "lax", // "none" in prod
    path: "/",
  });

  return res.status(200).json({ message: "Logout successful" });
};

module.exports = {
  registerNewUser,
  loginUserAccount,
  logout,
  BecomeProvider,
  BecomeUser,
  switchRole,
  VerifyUser,
  getLoggedInProviderData,
  updateProviderProfile,
  logoutUser,
};
