const express = require("express");
const router = express.Router();
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const User = require("../models/User");
const verifyToken = require("../middleware/verifyToken");
const nodemailer = require("nodemailer"); // make sure it's installed
const crypto = require("crypto");


router.get("/", (req, res) => {
  console.log("🔔 GET /api/users was called");
  res.send("✅ User route working");
});

// REGISTER
router.post("/register", async (req, res) => {
  try {
    const { name, email, password, role } = req.body;

    // Check if user exists
    const userExists = await User.findOne({ email });
    if (userExists) return res.status(400).json({ message: "User already exists" });

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create new user
    const newUser = await User.create({
      name,
      email,
      password: hashedPassword,
      role: role || "patient"
    });

    res.status(201).json({ message: "User registered successfully", user: newUser });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error" });
  }
});

// LOGIN
router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;

    // Check if user exists
    const user = await User.findOne({ email });
    if (!user) return res.status(404).json({ message: "User not found" });

    // Compare password
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) return res.status(401).json({ message: "Invalid password" });

    // Create JWT token
    const token = jwt.sign(
      { id: user._id, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: "1d" }
    );

    res.json({
      message: "Login successful",
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role
      }
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
});

// Temporary in-memory OTP store
let otpStore = {}; // { "user@example.com": { code: "123456", expires: 17123123 } }

// 🔐 SEND LOGIN CODE
router.post("/send-code", async (req, res) => {
  const { email } = req.body;

  // Validate user exists
  const user = await User.findOne({ email });
  if (!user) return res.status(404).json({ error: "User not found" });

  const code = Math.floor(100000 + Math.random() * 900000).toString(); // 6-digit OTP
  const expires = Date.now() + 5 * 60 * 1000; // 5 min expiry

  otpStore[email] = { code, expires };

  // Send email using nodemailer
  const transporter = nodemailer.createTransport({
    service: "gmail",
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS
    }
  });

  await transporter.sendMail({
    from: `"QuickClinic" <${process.env.EMAIL_USER}>`,
    to: email,
    subject: "Your QuickClinic Login Code",
    html: `<p>Your code is <strong>${code}</strong>. It expires in 5 minutes.</p>`
  });

  res.json({ message: "Code sent to email." });
});

// ✅ LOGIN WITH CODE
router.post("/login-code", async (req, res) => {
  const { email, code } = req.body;

  const record = otpStore[email];
  if (!record || record.code !== code || record.expires < Date.now()) {
    return res.status(400).json({ error: "Invalid or expired code" });
  }

  // Clear used OTP
  delete otpStore[email];

  // Find user and issue token
  const user = await User.findOne({ email });
  if (!user) return res.status(404).json({ error: "User not found" });

  const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, {
    expiresIn: "2d"
  });

  res.json({
    token,
    user: {
      id: user._id,
      name: user.name,
      email: user.email,
      role: user.role
    }
  });
});


// 🩺 Get all doctors
router.get("/doctors", async (req, res) => {
  try {
    const doctors = await User.find({ role: "doctor" }).select("name _id");
    res.json(doctors);
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch doctors" });
  }
});

// GET all patients
router.get("/patients", verifyToken, async (req, res) => {
  if (req.user.role !== "doctor") {
    return res.status(403).json({ error: "Access denied" });
  }

  try {
    const patients = await User.find({ role: "patient" }).select("_id name");
    res.json(patients);
  } catch (err) {
    res.status(500).json({ error: "Failed to load patients" });
  }
});



module.exports = router;
