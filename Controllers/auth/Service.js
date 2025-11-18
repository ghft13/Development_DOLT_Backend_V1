const { db } = require("../../Config/FireBase.js");

const serviceCollection = db.collection("services");


const addService = async (req, res) => {
  try {
   
    const { name, category, basePrice, description, icon, rating, reviewCount } = req.body;

    // ✅ Validate required fields
    if (!name || !category || !basePrice || !description) {
      return res.status(400).json({ error: "Missing required service fields" });
    }

    // 🔍 Check if a service with the same name already exists
    const existingService = await serviceCollection.where("name", "==", name).get();

    if (!existingService.empty) {
      return res.status(400).json({ error: "Service with this name already exists" });
    }

    // ✅ Create a new service
    const newService = {
      name,
      category,
      basePrice,
      description,
      icon: icon || "🔧",
      rating: rating || 0,
      reviewCount: reviewCount || 0,
      createdAt: new Date(),
    };

    // 🟢 Add to Firestore
    const docRef = await serviceCollection.add(newService);

    // ✅ Send success response
    return res.status(201).json({ id: docRef.id, ...newService });

  } catch (error) {
    console.error("Error adding service:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};



// 🟨 Get all services
const getAllServices = async (req, res) => {
  try {
    const snapshot = await serviceCollection.get();

    // Convert Firestore documents into an array
    const services = snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));

    res.status(200).json(services);
  } catch (error) {
    console.error("Error fetching services:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};
const updateService = async (req, res) => {
  try {
    const { id } = req.params;
    const data = req.body;

    if (!id) {
      return res.status(400).json({ error: "Service ID is required" });
    }

    const serviceRef = serviceCollection.doc(id);
    const docSnapshot = await serviceRef.get();

    if (!docSnapshot.exists) {
      return res.status(404).json({ error: "Service not found" });
    }

    await serviceRef.update({
      ...data,
      updatedAt: new Date(),
    });

    res.status(200).json({ id, ...data });
  } catch (error) {
    console.error("Error updating service:", error);
    res.status(500).json({ error: "Failed to update service" });
  }
};


const deleteService = async (req, res) => {
  try {
    const { id } = req.params;
    const serviceRef = db.collection("services").doc(id);
    const doc = await serviceRef.get();

    if (!doc.exists) {
      return res.status(404).json({ message: "Service not found" });
    }

    await serviceRef.delete();
    res.status(200).json({ message: "Service deleted successfully!" });
  } catch (error) {
    console.error("Error deleting service:", error);
    res.status(500).json({ message: "Failed to delete service." });
  }
};


module.exports = { addService, getAllServices, updateService, deleteService };
