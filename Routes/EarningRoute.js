const express=require("express")
const router=express.Router()
const {SeeEarnings}=require("../Controllers/auth/Earnings")

router.post("/earnings",SeeEarnings)

module.exports=router