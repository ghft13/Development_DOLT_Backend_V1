const express=require("express");
const router=express.Router();


const{GetUserDetails,getUserCounts, getAllBookingsWithStatus,GetServiceProviderDetails}
     =require("../Controllers/DashBoardController.js");


router.get("/users/count",getUserCounts);
router.get("/books",getAllBookingsWithStatus);
router.get("/users",GetUserDetails);
router.get("/serviceproviders",GetServiceProviderDetails);
module.exports=router