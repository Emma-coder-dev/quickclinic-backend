const express = require("express");
const router = express.Router();
const User = require("../models/User");
const Booking = require("../models/Booking");
const Record = require("../models/Record");

const verifyToken = require("../middleware/authMiddleware");
const verifyAdmin = require("../middleware/verifyAdmin");

// 📊 Get Admin Dashboard Summary
router.get("/summary", verifyToken, verifyAdmin, async (req, res) => {
  try {
    const totalUsers = await User.countDocuments();
    const totalBookings = await Booking.countDocuments();
    const totalRecords = await Record.countDocuments();
    const users = await User.find({}, "name email role");

    res.json({ totalUsers, totalBookings, totalRecords, users });
  } catch (err) {
    console.error("Error loading summary:", err);
    res.status(500).json({ message: "Error loading summary" });
  }
});

// 🔢 Admin Stats: doctors, patients, bookings
router.get("/stats", verifyToken, verifyAdmin, async (req, res) => {
  try {
    const totalUsers = await User.countDocuments();
    const totalDoctors = await User.countDocuments({ role: "doctor" });
    const totalPatients = await User.countDocuments({ role: "patient" });

    const totalBookings = await Booking.countDocuments();
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todaysBookings = await Booking.countDocuments({ date: { $gte: today } });

    res.json({ totalUsers, totalDoctors, totalPatients, totalBookings, todaysBookings });
  } catch (err) {
    console.error("Stats error:", err);
    res.status(500).json({ message: "Failed to fetch stats" });
  }
});

// 👥 Get All Users (excluding passwords)
router.get("/users", verifyToken, verifyAdmin, async (req, res) => {
  try {
    const users = await User.find({}, "-password");
    res.json(users);
  } catch (err) {
    console.error("Get users error:", err);
    res.status(500).json({ message: "Failed to fetch users" });
  }
});

// 🗑️ Delete User
router.delete("/user/:id", verifyToken, verifyAdmin, async (req, res) => {
  try {
    await User.findByIdAndDelete(req.params.id);
    res.json({ message: "User deleted" });
  } catch (err) {
    console.error("Delete user error:", err);
    res.status(500).json({ message: "Delete failed" });
  }
});

// 🔁 Promote/Demote User Role
router.put("/user/:id/role", verifyToken, verifyAdmin, async (req, res) => {
  const { newRole } = req.body;

  if (!["patient", "doctor", "admin"].includes(newRole)) {
    return res.status(400).json({ message: "Invalid role" });
  }

  try {
    const user = await User.findByIdAndUpdate(
      req.params.id,
      { role: newRole },
      { new: true }
    );

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    res.json({ message: `Role updated to ${newRole}`, user });
  } catch (err) {
    console.error("Update role error:", err);
    res.status(500).json({ message: "Failed to update role" });
  }
});

module.exports = router;
