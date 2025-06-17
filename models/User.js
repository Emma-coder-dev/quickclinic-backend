const mongoose = require("mongoose");

const userSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
  },

  email: {
    type: String,
    required: true,
    unique: true,
  },

  password: {
    type: String,
    required: true,
  },

  role: {
    type: String,
    enum: ["patient", "doctor", "admin"],
    default: "patient",
  },

  // 🔐 Password Reset Fields
  resetToken: {
    type: String,
  },


}, { timestamps: true });

module.exports = mongoose.model("User", userSchema);
