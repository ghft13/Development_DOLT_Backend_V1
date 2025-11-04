const bcrypt = require("bcryptjs");
const { generateTokens } = require("./tokenUtils");
const { admin, db } = require("../../Config/FireBase");

const registerNewUser = async (req, res) => {
  const { fullName, email, password, phone, role } = req.body;

  try {
    // ✅ Validate required fields
    if (!fullName || !email || !password || !phone || !role) {
      return res.status(400).json({ message: "All fields are required" });
    }

    // ✅ Validate role
    if (!["user", "provider"].includes(role)) {
      return res.status(400).json({ message: "Invalid role" });
    }

    // ✅ Determine collection
    const userCollection = role === "user" ? "users" : "serviceProviders";
    const otherCollection = role === "user" ? "serviceProviders" : "users";

    const userRef = db.collection(userCollection);
    const otherRef = db.collection(otherCollection);

    // ✅ Check if email or phone already exists
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

    // ✅ Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // ✅ Prepare user data
    let newUserData = {
      fullName,
      email,
      phone,
      password: hashedPassword,
      role,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      bookings: [],
      providerMapping: [],
    };

    if (role === "user") {
      newUserData.orderIds = [];
    } else {
      newUserData.totalClients = 0;
      newUserData.totalAppointments = 0;
      newUserData.earnings = 0;
      newUserData.ratings = [];
      newUserData.ratingCount = 0;
      newUserData.averageRating = 0;
      newUserData.professions = [];
      newUserData.acceptedBookings = [];
    }

    // ✅ Save to Firestore
    const docRef = await db.collection(userCollection).add(newUserData);

    // ✅ Generate JWT tokens
    const { token, refreshToken } = generateTokens(docRef.id, role);

    // ✅ Send Refresh Token cookie
    // res.cookie("refreshToken", refreshToken, {
    //   httpOnly: true,
    //   secure: false, // change to true in production (requires https)
    //   sameSite: "lax", // use "none" only with https
    //   domain: "api.d0lt.local", // your dev domain
    //   path: "/",
    //   maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    // });
    res.cookie("refreshToken", refreshToken, {
      httpOnly: true,
      secure: true, // ✅ required on Render (uses HTTPS)
      sameSite: "none", // ✅ required for cross-domain cookies
      path: "/", // ✅ valid for all routes
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    });

    // ✅ Send response
    res.status(201).json({
      message: "User registered successfully",
      user: {
        id: docRef.id,
        ...newUserData,
        password: undefined, // hide password
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
  const { email, role } = req.body; // 👈 get both email and role

  try {
    // 🧱 Check required fields
    if (!email || !role) {
      return res.status(400).json({ message: "Email and role are required" });
    }

    let userDoc = null;
    let userData = null;

    // 🔍 Search based on role
    if (role === "user") {
      const userSnapshot = await db
        .collection("users")
        .where("email", "==", email)
        .get();
      if (!userSnapshot.empty) {
        userDoc = userSnapshot.docs[0];
        userData = userDoc.data();
      }
    } else if (role === "provider") {
      const providerSnapshot = await db
        .collection("serviceProviders")
        .where("email", "==", email)
        .get();
      if (!providerSnapshot.empty) {
        userDoc = providerSnapshot.docs[0];
        userData = userDoc.data();
      }
    } else if (role === "admin") {
      const adminSnapshot = await db
        .collection("admins")
        .where("email", "==", email)
        .get();
      if (!adminSnapshot.empty) {
        userDoc = adminSnapshot.docs[0];
        userData = userDoc.data();
      }
    } else {
      return res.status(400).json({ message: "Invalid role provided" });
    }

    // ❌ No user found
    if (!userDoc) {
      return res
        .status(404)
        .json({ message: "User not found for given email and role" });
    }

    // 🧠 Generate tokens
    const { token, refreshToken } = generateTokens(userDoc.id, role);

    // 🧾 Safe user object
    const userSafe = {
      id: userDoc.id,
      fullName: userData.fullName,
      email: userData.email,
      phone: userData.phone || "",
      role,
    };

    // 🍪 Set refresh token cookie
    // res.cookie("refreshToken", refreshToken, {
    //   httpOnly: true,
    //   secure: false, // set true for production
    //   sameSite: "lax",
    //   domain: "api.d0lt.local",
    //   path: "/",
    //   maxAge: 7 * 24 * 60 * 60 * 1000,
    // });

    res.cookie("refreshToken", refreshToken, {
      httpOnly: true,
      secure: true, // ✅ required on Render (uses HTTPS)
      sameSite: "none", // ✅ required for cross-domain cookies
      path: "/", // ✅ valid for all routes
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    });

    // ✅ Success
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

const sendOtpToUserEmail = async (req, res) => {
  const { email, role } = req.body;

  if (!email || !role) {
    return res
      .status(400)
      .json({ message: "Please provide both email and role" });
  }

  try {
    const db = admin.firestore(); // Assuming Firebase admin is initialized elsewhere
    let userRef;
    let userSnapshot;

    if (role === "homeowner") {
      userRef = db.collection("homeowners").where("email", "==", email);
      userSnapshot = await userRef.get();
    } else if (role === "provider") {
      userRef = db.collection("serviceProviders").where("email", "==", email);
      userSnapshot = await userRef.get();
    } else if (role === "admin") {
      userRef = db.collection("admins").where("email", "==", email);
      userSnapshot = await userRef.get();
    } else {
      return res.status(400).json({ message: "Invalid role provided" });
    }

    if (userSnapshot.empty) {
      return res
        .status(404)
        .json({ message: "User not found. Please sign up first." });
    }

    // ✅ Include role in the response
    return res.status(200).json({
      message: "User exists. Proceed with OTP verification.",
      role, // <--- sent back to frontend
    });
  } catch (error) {
    return res
      .status(500)
      .json({ message: "Server error. Please try again later." });
  }
};

const createServiceProvider = async (req, res) => {
  const { name, email, password, mobnumber, professions } = req.body;

  try {
    if (
      !name ||
      !email ||
      !password ||
      !mobnumber ||
      !professions ||
      !Array.isArray(professions) ||
      professions.length === 0
    ) {
      return res.status(400).json({
        message:
          "Name, email, password, mobile number, and at least one profession are required",
      });
    }

    if (password.length < 6) {
      return res
        .status(400)
        .json({ message: "Password must be at least 6 characters long" });
    }

    // Check if email or mobile already exists in both collections
    const homeownersEmailSnapshot = await db
      .collection("homeowners")
      .where("email", "==", email)
      .get();

    const serviceProvidersEmailSnapshot = await db
      .collection("serviceProviders")
      .where("email", "==", email)
      .get();

    if (
      !homeownersEmailSnapshot.empty ||
      !serviceProvidersEmailSnapshot.empty
    ) {
      return res.status(400).json({ message: "Email already exists" });
    }

    const homeownersNumberSnapshot = await db
      .collection("homeowners")
      .where("mobnumber", "==", mobnumber)
      .get();

    const serviceProvidersNumberSnapshot = await db
      .collection("serviceProviders")
      .where("mobnumber", "==", mobnumber)
      .get();

    if (
      !homeownersNumberSnapshot.empty ||
      !serviceProvidersNumberSnapshot.empty
    ) {
      return res.status(400).json({ message: "Mobile number already exists" });
    }

    // Create service provider
    const userRef = db.collection("serviceProviders").doc();
    const hashedPassword = await bcrypt.hash(password, 10);

    const newProvider = {
      userid: userRef.id,
      name: name.trim(),
      email: email.trim(),
      mobnumber: mobnumber.trim(),
      password: hashedPassword,
      role: "provider",
      status: "active",
      professions: professions, // <-- store professions array
      bookingIds: [],
      total_clients: 0,
      total_Appointments: 0,
      earnings: 0,
      Rating: 0,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      passwordChanged: false,
    };

    await userRef.set(newProvider);

    // Return success without sensitive data
    const responseData = {
      userid: userRef.id,
      name: newProvider.name,
      email: newProvider.email,
      mobnumber: newProvider.mobnumber,
      professions: newProvider.professions,
      role: newProvider.role,
      status: newProvider.status,
    };

    res.status(201).json({
      message: "Service provider created successfully",
      provider: responseData,
    });
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

const updateUserProfile = async (req, res) => {
  const { id } = req.params;
  const { name, email, mobnumber, address, profilePic } = req.body;

  try {
    // Find user in both collections
    let userRef = db.collection("homeowners").doc(id);
    let userDoc = await userRef.get();
    let collection = "homeowners";
    if (!userDoc.exists) {
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
    // Only allow email change for homeowners
    if (collection === "homeowners" && typeof email !== "undefined")
      updates.email = email;

    await userRef.update(updates);
    const updatedDoc = await userRef.get();
    const userData = updatedDoc.data();
    delete userData.password;
    res.json({ user: { id, ...userData } });
  } catch (error) {
    res
      .status(500)
      .json({ message: "Failed to update profile", error: error.message });
  }
};

module.exports = {
  registerNewUser,
  loginUserAccount,
  sendOtpToUserEmail,
  logout,
  createServiceProvider,
  updateUserProfile,
};
