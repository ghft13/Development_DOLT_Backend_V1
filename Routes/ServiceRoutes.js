const express = require("express");
const { addService, getAllServices,updateService,deleteService} 
=require( "../Controllers/auth/Service.js")

const router = express.Router();



// Add a new service
router.post("/add", addService);
router.get("/all", getAllServices)
router.put("/update/:id", updateService);
router.delete("/delete/:id", deleteService);
  

module.exports = router;
