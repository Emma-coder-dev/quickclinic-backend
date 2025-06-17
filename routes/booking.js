const express = require("express");
const router = express.Router();
const Booking = require("../models/Booking");
const verifyToken = require("../middleware/authMiddleware");

// ✅ Create Booking (for patients)
router.post("/", verifyToken, async (req, res) => {
  const { doctor, date, reason } = req.body;

  try {
    const booking = await Booking.create({
      patient: req.user.id,
      doctor,
      date,
      reason,
    });

    res.status(201).json(booking);
  } catch (err) {
    console.error("Booking error:", err);
    res.status(500).json({ error: "Failed to create booking" });
  }
});

// ✅ Patient View: Get logged-in patient's bookings
router.get("/mine", verifyToken, async (req, res) => {
  if (req.user.role !== "patient") {
    return res.status(403).json({ error: "Access denied: Patients only" });
  }

  try {
    const bookings = await Booking.find({ patient: req.user.id })
      .populate("doctor", "name email")
      .sort({ date: -1 });

    res.json(bookings);
  } catch (err) {
    console.error("❌ Error fetching bookings:", err);
    res.status(500).json({ error: "Failed to load bookings" });
  }
});

// ✅ Doctor View: Get logged-in doctor's bookings
router.get("/doctor", verifyToken, async (req, res) => {
  if (req.user.role !== "doctor") {
    return res.status(403).json({ error: "Access denied: Doctors only" });
  }

  try {
    const bookings = await Booking.find({ doctor: req.user.id })
      .populate("patient", "name email")
      .sort({ date: -1 });

    res.json(bookings);
  } catch (err) {
    res.status(500).json({ error: "Failed to load doctor's bookings" });
  }
});

// ✅ Optional: Admin access to all bookings
router.get("/", verifyToken, async (req, res) => {
  if (req.user.role !== "admin") {
    return res.status(403).json({ error: "Admins only" });
  }

  try {
    const bookings = await Booking.find()
      .populate("patient doctor", "name email role")
      .sort({ date: -1 });

    res.json(bookings);
  } catch (err) {
    res.status(500).json({ message: "Failed to fetch all bookings" });
  }
});

module.exports = router;
