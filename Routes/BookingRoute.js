const express=require("express")
const router=express.Router()
const {createBooking,getBookingdata,UpdateBooking,getProviderBookings,CancelBooking,DeleteBooking,rateBooking,addEarning,getBookingById}=require("../Controllers/auth/Booking")

router.post("/createBooking", createBooking)
router.get("/getbookingdata", getBookingdata)
router.get("/getProviderbookings", getProviderBookings)
router.get("/getBooking/:id", getBookingById) // New Route
router.put("/:id", UpdateBooking)



module.exports = router