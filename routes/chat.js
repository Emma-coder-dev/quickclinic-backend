const express = require("express");
const router = express.Router();
const Chat = require("../models/chat");
const verifyToken = require("../middleware/verifyToken");


// ✉️ Send message
router.post("/", verifyToken, async (req, res) => {
  const { receiver, message } = req.body;
  try {
    const chat = await Chat.create({
      sender: req.user.id,
      receiver,
      message,
    });
    res.status(201).json(chat);
  } catch (err) {
    res.status(500).json({ error: "Failed to send message" });
  }
});

// 📥 Get chat with specific doctor
router.get("/:doctorId", verifyToken, async (req, res) => {
  try {
    const chats = await Chat.find({
      $or: [
        { sender: req.user.id, receiver: req.params.doctorId },
        { sender: req.params.doctorId, receiver: req.user.id },
      ]
    }).sort({ timestamp: 1 });

    res.json(chats);
  } catch (err) {
    res.status(500).json({ error: "Failed to load chat" });
  }
});

module.exports = router;
