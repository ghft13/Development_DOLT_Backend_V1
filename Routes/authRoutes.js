const express = require("express");
const router = express.Router();
const {
  registerNewUser,
  loginUserAccount,
  logout,
  BecomeProvider,
  BecomeUser,
  switchRole,
  VerifyUser,
  updateProviderProfile,
  getLoggedInProviderData,
  logoutUser
} = require("../Controllers/auth/userAuth");



router.post("/signup", registerNewUser);
router.post("/login", loginUserAccount);
router.post("/logout", logout);
router.post("/become-provider",BecomeProvider)
router.post("/become-user",BecomeUser)
router.post("/switch-role",switchRole)

router.get("/verify",VerifyUser)
router.get("/me", getLoggedInProviderData);
router.put("/update-profile",  updateProviderProfile);
router.post("/logout", logoutUser);
module.exports = router;
