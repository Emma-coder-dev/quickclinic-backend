const express = require("express");
const multer = require("multer");
const router = express.Router();
const verifyToken = require("../middleware/verifyToken");
const Record = require("../models/Record");
const path = require("path");

// Multer setup
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, "uploads/"),
  filename: (req, file, cb) => cb(null, `${Date.now()}-${file.originalname}`)
});

const upload = multer({ storage });

// ✅ Upload a record
router.post("/", verifyToken, upload.single("record"), async (req, res) => {
  try {
    const record = new Record({
      patient: req.user.id,
      file: req.file.path,
      description: req.body.description
    });
    await record.save();
    res.status(201).json(record);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to upload record" });
  }
});

// 📂 Get current user's records
router.get("/mine", verifyToken, async (req, res) => {
  try {
    const records = await Record.find({ patient: req.user.id });
    res.json(records);
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch records" });
  }
});

// 👩‍⚕️ Doctor view (patients who booked with them)
router.get("/doctor", verifyToken, async (req, res) => {
  if (req.user.role !== "doctor") return res.status(403).json({ error: "Access denied" });

  const patientIds = await require("../models/Booking").find({ doctor: req.user.id }).distinct("patient");

  const records = await Record.find({ patient: { $in: patientIds } }).populate("patient", "name email");
  res.json(records);
});

// Get all patients (for doctor dropdown)
router.get("/patients", verifyToken, async (req, res) => {
  if (req.user.role !== "doctor") return res.status(403).json({ error: "Access denied" });

  try {
    const patients = await User.find({ role: "patient" }).select("name email _id");
    res.json(patients);
  } catch (err) {
    res.status(500).json({ error: "Failed to load patients" });
  }
});

// Get records for a specific patient
router.get("/patient/:id", verifyToken, async (req, res) => {
  if (req.user.role !== "doctor") return res.status(403).json({ error: "Access denied" });

  try {
    const records = await Record.find({ patient: req.params.id }).sort({ date: -1 });
    res.json(records);
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch patient records" });
  }
});

// DELETE /api/records/:id
router.delete("/:id", verifyToken, async (req, res) => {
  try {
    const record = await Record.findById(req.params.id);

    if (!record) return res.status(404).json({ error: "Record not found" });

    // Allow only the record owner (patient) or admin to delete
    if (
      req.user.role !== "admin" &&
      record.patient.toString() !== req.user.id
    ) {
      return res.status(403).json({ error: "Access denied" });
    }

    // Delete file from server
    const fs = require("fs");
    const filePath = `./uploads/${record.file}`;
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }

    await record.deleteOne();
    res.json({ message: "Record deleted" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to delete record" });
  }
});


module.exports = router;
