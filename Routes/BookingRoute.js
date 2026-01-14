const express = require("express")
const router = express.Router()
const {
    createBooking,
    getBookingdata,
    UpdateBooking,
    getProviderBookings,
    CancelBooking,
    DeleteBooking,
    rateBooking,
    reportIssue,
    addEarning,
    getBookingById
} = require("../Controllers/auth/Booking");

router.post("/createBooking", createBooking);
router.get("/getBookingdata", getBookingdata);
router.put("/updateBooking/:id", UpdateBooking);
router.get("/provider/bookings/:providerId", getProviderBookings);
router.patch("/:id/cancel", CancelBooking);
router.delete("/delete/:id", DeleteBooking);
router.post("/rate", rateBooking);
router.post("/report-issue", reportIssue); // ✅ New route
router.post("/addEarning", addEarning);
router.get("/:id", getBookingById);




module.exports = router