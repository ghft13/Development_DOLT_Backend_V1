const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const Admin = require("../../Models/Admin");
const { db } = require("../../Config/FireBase");

const createDefaultAdmin = async () => {
  try {
    const admins = [
      {
        adminId: "admin123",
        name: "Super Admin",
        password: "123",
        role: "admin",
      },
      {
        adminId: "admin456",
        name: "TestAdmin",
        password: "abc",
        role: "admin",
      },
    ];

    for (const admin of admins) {
      const adminRef = db.collection("admins").doc(admin.adminId);
      const existingAdmin = await adminRef.get();

      if (!existingAdmin.exists) {
        const saltRounds = 10;
        const hashedPassword = await bcrypt.hash(admin.password, saltRounds);
        const newDocRef = db.collection("admins").doc();
        await adminRef.set({
          id: newDocRef.id,
          adminId: admin.adminId,
          name: admin.name,
          password: hashedPassword,
          role: admin.role,
          createdAt: new Date().toISOString(), // or use admin.firestore.Timestamp.now()
        });

        //    console.log(`Created admin: ${admin.name}`);
      } else {
        //    console.log(`Admin ${admin.name} already exists.`);
      }
    }

    // console.log("Admin setup completed.");
  } catch (error) {
    console.error("Error creating admins:", error);
  }
};

const adminLoginHandler = async (req, res) => {
  try {
    const { adminId, password } = req.body;

    if (!adminId || !password) {
      return res
        .status(400)
        .json({ message: "Admin ID and password are required" });
    }

    // Fetch admin doc from Firestore
    const adminRef = db.collection("admins").doc(adminId);
    const adminDoc = await adminRef.get();

    if (!adminDoc.exists) {
      return res.status(401).json({ message: "Invalid credentials" });
    }

    const admin = adminDoc.data();

    // Compare password
    const isMatch = await bcrypt.compare(password, admin.password);
    if (!isMatch) {
      return res.status(401).json({ message: "Invalid credentials" });
    }

    // Generate JWT token
    const token = jwt.sign(
      { id: admin.adminId, role: "admin" },
      process.env.JWT_SECRET,
      { expiresIn: "12h" }
    );

    res.json({
      token,
      user: { name: admin.name, adminId: admin.adminId, role: "admin" },
    });
  } catch (error) {
    res.status(500).json({ message: "Server error" });
  }
};

module.exports = {
  createDefaultAdmin,
  adminLoginHandler,
};
