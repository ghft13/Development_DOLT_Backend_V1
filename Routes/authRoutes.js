const express = require("express");
const router = express.Router();
const {
  logout,
  VerifyUser,
  BecomeProvider,
  BecomeUser,
  switchRole,
  updateProviderProfile,
  updateUserProfile,
  getLoggedInProviderData,
  loginWithFirebase,
  signupWithFirebase
} = require("../Controllers/auth/userAuth");



router.post("/signup-firebase", signupWithFirebase); // ✅ New
router.post("/login-firebase", loginWithFirebase); // ✅ New
router.post("/logout", logout);
router.get("/verify", VerifyUser);

router.post("/become-provider", BecomeProvider)
router.post("/become-user", BecomeUser)
router.post("/switch-role", switchRole)

router.get("/me", getLoggedInProviderData);
router.put("/update-profile", updateProviderProfile); // Provider update (PUT)
router.post("/update-profile", updateUserProfile); // User update (POST)

module.exports = router;
