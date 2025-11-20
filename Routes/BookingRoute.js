const express=require("express")
const router=express.Router()
const {createBooking,getBookingdata,UpdateBooking,getProviderBookings,CancelBooking,DeleteBooking,rateBooking,addEarning}=require("../Controllers/auth/Booking")


const multer = require("multer");
const path = require("path");


const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, "uploads/");
  },
  filename: function (req, file, cb) {
    cb(null, Date.now() + path.extname(file.originalname));
  },
});
const upload = multer({ storage });

router.post("/createBooking",createBooking)
router.get("/getbookingdata",getBookingdata)
router.get("/getProviderbookings",getProviderBookings)
router.put("/:id",UpdateBooking)



module.exports=router