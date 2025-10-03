// middleware/AuthMiddleware.js

const jwt = require("jsonwebtoken");
// const User = require("../Models/Homeowner");
const { db } = require("../Config/FireBase");

const authenticateUser = async (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({ message: "Not authorized, no token" });
  }

  const token = authHeader.split(" ")[1];
  

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    const userId = decoded.id;
    const userRole = decoded.role;

    let collection = 
    userRole === "homeowner"
      ? "homeowners"
      : userRole === "provider"
      ? "serviceProviders"
      : userRole === "admin"
      ? "admins" // assuming you have an "admins" collection
      : null;
  
    if (!collection) {
      return res.status(400).json({ message: "Invalid user role" });
    }

    const userRef = db.collection(collection).doc(userId);
    const userSnap = await userRef.get();

    if (!userSnap.exists) {
      return res.status(404).json({ message: "User not found" });
    }

    const userData = userSnap.data();
    delete userData.password;

    // Send response directly since you removed the separate controller
    return res.status(200).json({ id: userId, ...userData });

  } catch (error) {
  //  console.error("Token verification failed:", error);
    return res.status(401).json({ message: "Not authorized, token failed" });
  }
};




const authenticateAdmin=async(req,res,next)=>{
  const authHeader=req.headers.authorization
  if(!authHeader || !authHeader.startsWith("Bearer ")){
    return res.status(401).json({message:"Not authorized, no token"})
  }
  const token=authHeader.split(" ")[1]

  try{
    const decoded=jwt.verify(token,process.env.JWT_SECRET)
    const adminId=decoded.id
    const adminRef=db.collection("admins").doc(adminId)
    const adminSnap=await adminRef.get()
    if(!adminSnap.exists){
      return res.status(404).json({message:"Admin not found"})
    }
    const adminData=adminSnap.data()
    delete adminData.password
    req.admin={id:adminId,...adminData}
    next()
  }
  catch(error){
 //   console.error("Token verification failed:",error)
    return res.status(401).json({message:"Not authorized, token failed"})
  }
}


module.exports = { authenticateUser,authenticateAdmin };


