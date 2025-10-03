const express = require("express");
const router = express.Router();
const {
  registerNewUser,
  loginUserAccount,
 // getAuthenticatedUser,
  sendOtpToUserEmail,
  logout,
  createServiceProvider,
  updateUserProfile
} = require("../Controllers/auth/userAuth");
const { adminLoginHandler} = require("../Controllers/auth/adminAuth");
const {authenticateUser}=require('../Middleware/Authmiddleware')

router.post("/signup", registerNewUser);
router.post("/login", loginUserAccount);
router.post("/logout", logout);
router.get("/user", authenticateUser, (req, res) => {
  res.json({ user: req.user });
});
router.post("/admin-login", adminLoginHandler);
router.post("/getemailotp", sendOtpToUserEmail);
router.post("/create-provider", createServiceProvider);
router.put("/profile/:id", updateUserProfile);

module.exports = router;
