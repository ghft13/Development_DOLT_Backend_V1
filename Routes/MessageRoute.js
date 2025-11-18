const express =require("express");
const { getUserConversations,getProviderConversations}=require ("../Controllers/auth/messagesController.js")

const router = express.Router();

router.get("/conversations", getProviderConversations);
router.get("/User-conversations", getUserConversations);

module.exports = router;
