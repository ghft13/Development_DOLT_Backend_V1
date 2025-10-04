const ServiceData=require("../Data/ServiceData.js")
const express=require("express")
const router = express.Router()

router.get("/", (req, res) => {
  res.json(ServiceData)
})

router.get("/:id", (req, res) => {
  const service = ServiceData.find((s) => s.id === req.params.id)
  if (!service) {
    return res.status(404).json({ error: "Service not found" })
  }
  res.json(service)
})

module.exports = router