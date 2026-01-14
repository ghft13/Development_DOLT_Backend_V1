const express = require("express");
const { getUserConversations, getProviderConversations, sendMessage } = require("../Controllers/auth/messagesController.js")

const router = express.Router();

router.get("/conversations", getProviderConversations);
router.get("/User-conversations", getUserConversations);
router.post("/send", sendMessage); // ✅ New route

module.exports = router;
