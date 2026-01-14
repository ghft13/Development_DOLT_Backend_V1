const bcrypt = require("bcryptjs");
const { generateTokens } = require("./tokenUtils");
const { db, admin } = require("../../Config/FireBase.js");
const { verifyRefreshToken } = require("./tokenUtils");

// ✅ Helper for dynamic cookie configuration
// ✅ Helper for dynamic cookie configuration
const getCookieOptions = (req) => {
  const isProduction = process.env.NODE_ENV === "production";
  const cookieDomain = process.env.COOKIE_DOMAIN; // e.g., ".d0lt.com"

  return {
    httpOnly: true,
    secure: isProduction || process.env.COOKIE_SECURE === "true", // Always secure in production
    sameSite: isProduction ? "None" : "Lax", // "None" allows cross-site (needed for different domains), "Lax" for local
    domain: cookieDomain || undefined, // Set if sharing across subdomains
    path: "/",
    maxAge: 7 * 24 * 60 * 60 * 1000,
  };
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
        password: password || "N/A", // ✅ Handle undefined password from Firebase users
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
        acceptedOrders: [], // ✅ Added acceptedOrders
        avatar: "", // ✅ Initialize avatar
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

    // ✅ Mark user document as also provider AND switch role immediately
    await userRef.update({ isAlsoProvider: true, role: "provider" });

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

const logout = async (req, res) => {
  res.clearCookie("refreshToken", {
    ...getCookieOptions(req),
    maxAge: 0,
  });

  res.json({ success: true, message: "Logged out successfully" });
};

const VerifyUser = async (req, res) => {
  // console.log("🔍 [Backend] VerifyUser Request:");
  // console.log("   Origin:", req.headers.origin);
  // console.log("   Cookie Header:", req.headers.cookie);
  // console.log("   Parsed Cookies:", req.cookies);

  const refreshToken = req.cookies.refreshToken;
  // console.log("   RefreshToken Value:", refreshToken);

  if (!refreshToken) {
    return res.status(401).json({ message: "Not authenticated — token unavailable" });
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
    if (userData.role === "admin" && adminSnap.exists) doc = adminSnap.data();
    else if (userData.role === "provider" && providerSnap.exists) doc = providerSnap.data();
    else if (userData.role === "user" && userSnap.exists) doc = userSnap.data();

    if (!doc) {
      if (userSnap.exists) doc = userSnap.data();
      else if (providerSnap.exists) doc = providerSnap.data();
      else if (adminSnap.exists) doc = adminSnap.data();
      else return res.status(404).json({ message: "User not found" });
    }

    const finalRole = doc.role || userData.role || (doc.isAlsoProvider ? "provider" : "user");

    return res.json({
      user: {
        id: userData.id,
        email: doc.email,
        fullName: doc.fullName || doc.name || "Admin",
        role: finalRole,
        isAlsoUser: doc.isAlsoUser ?? false,
        isAlsoProvider: doc.isAlsoProvider ?? false,
        phone: doc.phone || "",
        avatar: doc.avatar || "",
      },
    });
  } catch (err) {
    return res.status(401).json({ message: "Invalid token" });
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
        password: password || "N/A", // ✅ Handle undefined password
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

    // ✅ Sync common fields to 'users' collection if the user exists
    const userRef = db.collection("users").doc(userId);
    const userSnap = await userRef.get();

    if (userSnap.exists) {
      const userUpdates = {};
      if (updates.fullName) userUpdates.fullName = updates.fullName;
      if (updates.email) userUpdates.email = updates.email;
      if (updates.avatar !== undefined) userUpdates.avatar = updates.avatar;

      if (Object.keys(userUpdates).length > 0) {
        await userRef.update(userUpdates);
        // console.log(`✅ Synced profile updates to users collection for ${userId}`);
      }
    }

    return res.json({
      message: "Profile updated successfully",
      updated: updates,
    });
  } catch (error) {
    console.error("Profile Update Error:", error);
    return res.status(500).json({ message: "Something went wrong" });
  }
};


const updateUserProfile = async (req, res) => {
  try {
    const { userId, name, email, phone, address, city, state, zipCode, avatar } = req.body;

    if (!userId) {
      return res.status(401).json({ message: "Unauthorized user" });
    }

    // Determine collection based on where user is found, OR update 'users' collection generally.
    // For now, let's assume 'users' collection. 
    // IF the user is also a provider, we might want to update both?
    // Let's stick to updating the 'users' document for now as this is the 'User Dashboard'.

    const userRef = db.collection("users").doc(userId);
    const userSnap = await userRef.get();

    if (!userSnap.exists) {
      // Fallback: check if they are a provider only? 
      // But if they are in User Dashboard, they should have a user doc (created via Become User if needed).
      // If not, we error out.
      return res.status(404).json({ message: "User profile not found" });
    }

    const updates = {};
    if (name) updates.fullName = name;
    if (phone) updates.phone = phone;
    if (address) updates.address = address;
    if (city) updates.city = city;
    if (state) updates.state = state;
    if (zipCode) updates.zipCode = zipCode;
    if (avatar) updates.avatar = avatar;

    await userRef.update(updates);

    // If user is also a provider, we might want to sync common fields (name, phone, avatar) to keep them consistent?
    // Optional improvement for later.

    return res.json({
      message: "Profile updated successfully",
      updated: updates,
    });

  } catch (error) {
    console.error("User Profile Update Error:", error);
    return res.status(500).json({ message: "Something went wrong" });
  }
};

const loginWithFirebase = async (req, res) => {
  const { idToken, role: requestedRole } = req.body;
  // console.log("🔥 [Backend] Login initiated. Token length:", idToken?.length);
  // console.log("🔥 [Backend] Login requested role:", requestedRole);

  if (!idToken) {
    return res.status(400).json({ message: "ID Token is required" });
  }

  try {
    const decodedToken = await admin.auth().verifyIdToken(idToken);
    const { email, uid, picture } = decodedToken;
    // console.log("✅ [Backend] Token verified. Email:", email);

    let userDoc = null;
    let userData = null;
    let role = "";
    let collectionName = "";

    // ✅ STRICT MODE: If role is provided, ONLY check that specific collection
    if (requestedRole) {
      if (requestedRole === "user") {
        const userSnapshot = await db.collection("users").where("email", "==", email).get();
        if (!userSnapshot.empty) {
          userDoc = userSnapshot.docs[0];
          userData = userDoc.data();
          role = "user";
        }
      } else if (requestedRole === "provider") {
        const providerSnapshot = await db.collection("serviceProviders").where("email", "==", email).get();
        if (!providerSnapshot.empty) {
          userDoc = providerSnapshot.docs[0];
          userData = userDoc.data();
          role = "provider";
        }
      } else if (requestedRole === "admin") {
        const adminSnapshot = await db.collection("admins").where("email", "==", email).get();
        if (!adminSnapshot.empty) {
          userDoc = adminSnapshot.docs[0];
          userData = userDoc.data();
          role = "admin";
        }
      }

      if (!userDoc) {
        console.warn(`⚠️ [Backend] User not found in requested role: ${requestedRole}`);
        return res.status(404).json({ message: `Account not found for role: ${requestedRole}. Please sign up.` });
      }

    } else {
      // 🔄 LEGACY MODE: Fallback to finding user anywhere (search all collections)
      // 1. Try to find user in 'users'
      const userSnapshot = await db.collection("users").where("email", "==", email).get();
      if (!userSnapshot.empty) {
        userDoc = userSnapshot.docs[0];
        userData = userDoc.data();
        role = "user";
      }

      // 2. If not found, try 'serviceProviders'
      if (!userDoc) {
        const providerSnapshot = await db.collection("serviceProviders").where("email", "==", email).get();
        if (!providerSnapshot.empty) {
          userDoc = providerSnapshot.docs[0];
          userData = userDoc.data();
          role = "provider";
        }
      }

      // 3. If still not found, try 'admins'
      if (!userDoc) {
        const adminSnapshot = await db.collection("admins").where("email", "==", email).get();
        if (!adminSnapshot.empty) {
          userDoc = adminSnapshot.docs[0];
          userData = userDoc.data();
          role = "admin";
        }
      }
    }

    // console.log("🔍 [Backend] User lookup. Found:", !!userDoc, "Role:", role);

    if (!userDoc) {
      console.warn("⚠️ [Backend] User not found in any collection.");
      return res.status(404).json({ message: "User not found. Please sign up first." });
    }

    // Link Firebase UID if not already linked (optional but good for future)
    if (!userData.firebaseUid) {
      await userDoc.ref.update({ firebaseUid: uid });
    }

    // Generate Application Tokens
    const { token, refreshToken } = generateTokens(userDoc.id, role);
    // console.log("🎟️ [Backend] Generated Refresh Token for user:", userDoc.id);

    // Set Cookie
    const cookieOptions = getCookieOptions(req);
    // console.log("🍪 [Backend] Setting Cookie with options:", cookieOptions);
    res.cookie("refreshToken", refreshToken, cookieOptions);

    return res.status(200).json({
      message: "Login successful",
      user: {
        id: userDoc.id,
        email: userData.email,
        fullName: userData.fullName || userData.name,
        role: role,
        avatar: userData.avatar || picture || "",
      },
      token,
      role,
    });
    // console.log("✅ [Backend] Login successful. Cookie set for:", email);
    return response; // Just in case, but returning directly above. wait, this is inside async.
    // Retaining original return structure:


  } catch (error) {
    // console.error("❌ [Backend] Firebase Login Error:", error);
    return res.status(401).json({ message: "Invalid or expired token", error: error.message });
  }
};

const signupWithFirebase = async (req, res) => {
  const { idToken, role, fullName, phone } = req.body;

  if (!idToken || !role) {
    return res.status(400).json({ message: "ID Token and Role are required" });
  }

  try {
    const decodedToken = await admin.auth().verifyIdToken(idToken);
    const { email, uid, picture } = decodedToken;

    // Check if user exists anywhere
    const checks = await Promise.all([
      db.collection("users").where("email", "==", email).get(),
      db.collection("serviceProviders").where("email", "==", email).get(),
      db.collection("admins").where("email", "==", email).get(),
    ]);

    if (checks.some((snap) => !snap.empty)) {
      return res.status(400).json({ message: "User already exists with this email." });
    }

    // Create new user in Firestore
    // Using Firebase UID as the document ID ensures 1:1 mapping and easier security rules later
    // BUT typically this app uses auto-generated IDs. To keep it consistent with `registerNewUser`, we can generate one.
    // However, knowing the UID is valuable. Let's use the UID as the ID for clarity if acceptable, 
    // OR just store it. Given the existing code uses `newDocRef.id`, we'll stick to that style EXCEPT 
    // it's cleaner to use UID if we are fully migrating. 
    // **Decision**: Use UID as document ID for new Firebase users. It prevents duplicates naturally.

    const collection = role === "user" ? "users" : (role === "provider" ? "serviceProviders" : "users");
    // Note: Admin signup usually restricted.

    // Safety check for role
    if (!["user", "provider"].includes(role)) {
      return res.status(400).json({ message: "Invalid role" });
    }

    const newUserRef = db.collection(collection).doc(uid); // Use UID as Doc ID

    const newUserData = {
      id: uid,
      firebaseUid: uid,
      fullName: fullName || email.split("@")[0],
      email,
      phone: phone || "",
      role,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      avatar: picture || "",
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
      newUserData.acceptedOrders = [];
      newUserData.hourlyRate = 0;
      newUserData.skills = [];
      newUserData.serviceAreas = [];
    } else {
      newUserData.isAlsoUser = true;
      newUserData.bookings = [];
      newUserData.orderIds = [];
    }

    await newUserRef.set(newUserData);

    // Generate Tokens
    const { token, refreshToken } = generateTokens(uid, role);

    // Set Cookie
    res.cookie("refreshToken", refreshToken, getCookieOptions(req));

    return res.status(201).json({
      message: "User registered successfully",
      user: newUserData,
      token,
      role,
    });

  } catch (error) {
    // console.error("Firebase Signup Error:", error);
    return res.status(500).json({ message: "Signup failed", error: error.message });
  }
};


module.exports = {
  logout,
  VerifyUser,
  BecomeProvider,
  BecomeUser,
  switchRole,
  getLoggedInProviderData,
  updateProviderProfile,
  updateUserProfile,
  loginWithFirebase,
  signupWithFirebase,
};
