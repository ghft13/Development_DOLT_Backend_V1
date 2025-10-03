const express=require("express")
const router=express.Router()
const {createBooking,getBookingdata,UpdateBooking,getProviderBookings,CancelBooking,DeleteBooking,rateBooking,addEarning}=require("../Controllers/auth/Booking")
const {
  GetServicePrice, AddService, UpdateService, DeleteService, UploadProfileImage
} = require("../Controllers/auth/ServiceAuth")

const multer = require("multer");
const path = require("path");
const BookingModel = require('../Models/Booking');
const ServiceProvider = require('../Models/ServiceProvider');

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
router.put("/cancel/:id",CancelBooking)
router.put("/:id",UpdateBooking)
router.get("/serviceprice",GetServicePrice)
// --- Product/Service CRUD for admin ---
router.post("/service",AddService)
router.put("/service/:id",UpdateService)
router.delete("/service/:id",DeleteService)
router.post("/upload/profile", upload.single("image"), UploadProfileImage);
router.delete("/:id", DeleteBooking);

// Rate a booking and update provider's average rating
router.post('/rate', rateBooking);
router.post('/addEarning', addEarning);

module.exports=router