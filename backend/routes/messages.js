const express = require('express');
const Message = require('../models/Message');
const User = require('../models/User');
const { protect } = require('../middleware/auth');

const router = express.Router();

router.get('/conversations', protect, async (req, res) => {
  try {
    const messages = await Message.find({
      $or: [{ sender: req.user._id }, { receiver: req.user._id }]
    }).sort({ createdAt: -1 });

    const conversations = {};
    messages.forEach(msg => {
      const otherUserId = msg.sender.toString() === req.user._id.toString() 
        ? msg.receiver.toString() 
        : msg.sender.toString();
      
      if (!conversations[otherUserId]) {
        conversations[otherUserId] = msg;
      }
    });

    const userIds = Object.keys(conversations);
    const users = await User.find({ _id: { $in: userIds } });

    const conversationList = users.map(user => ({
      user,
      lastMessage: conversations[user._id.toString()]
    }));

    res.status(200).json({ success: true, data: conversationList });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

router.get('/:userId', protect, async (req, res) => {
  try {
    const messages = await Message.find({
      $or: [
        { sender: req.user._id, receiver: req.params.userId },
        { sender: req.params.userId, receiver: req.user._id }
      ]
    }).sort({ createdAt: 1 });

    res.status(200).json({ success: true, data: messages });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

router.post('/', protect, async (req, res) => {
  try {
    const { receiver, text } = req.body;
    const message = await Message.create({
      sender: req.user._id,
      receiver,
      text
    });

    await message.populate('sender', 'username email avatar');
    await message.populate('receiver', 'username email avatar');

    res.status(201).json({ success: true, data: message });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

router.get('/users/all', protect, async (req, res) => {
  try {
    const users = await User.find({ _id: { $ne: req.user._id } });
    res.status(200).json({ success: true, data: users });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

module.exports = router;
