const express=require("express");
const router=express.Router();


const{getdata,GetTotalBookings,GetUserDetails,DeleteUser,AdminUpdateUser,SuspendUser}=require("../Controllers/DashBoardController.js");
const { authenticateAdmin } = require("../Middleware/Authmiddleware.js");

router.get("/data",getdata)
router.get("/TotalBookings",GetTotalBookings)
router.get("/user-details",GetUserDetails)

// Admin user management
router.delete("/user/:id", DeleteUser);
router.put("/user/:id", AdminUpdateUser);
router.put("/user/:id/suspend", SuspendUser);

module.exports=router