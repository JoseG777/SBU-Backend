const express = require('express');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const router = express.Router();

//request and response 
//request is what the user sends to the server
//response is what the server sends back to the user

router.post('/signup', async (req, res) => {
    try {
      const { username, password } = req.body;
      const user = new User({ username, password });
      await user.save();
      const token = jwt.sign({ userId: user._id }, process.env.JWT_SECRET , { expiresIn: '1h' });
      res.status(201).json({ token });
    } catch (error) {
      res.status(400).json({ message: error.message });
    }
});
  
router.post('/signin', async (req, res) => {
    try {
        const { login, password } = req.body;
        const user = await User.findOne({
            $or: [{ username: login }]
        });

        if (!user) {
            return res.status(401).json({ message: 'User not found' });
        }

        const isMatch = await user.comparePassword(password);
        if (!isMatch) {
            return res.status(401).json({ message: 'Incorrect password' });
        }

        const token = jwt.sign({ userId: user._id }, process.env.JWT_SECRET , { expiresIn: '1h' });
        res.status(200).json({ token });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});
  
  
module.exports = router;
  