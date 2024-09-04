const crypto = require('crypto');
const bcrypt = require('bcrypt');
const User = require('../models/userModel');
const sendEmail = require('../utils/sendEmail'); // Import the sendEmail utility
const jwt = require("jsonwebtoken");

const createToken = (_id) => {
  return jwt.sign({ _id }, process.env.SECRET, { expiresIn: "30d" });
};

// login a user
const loginUser = async (req, res) => {
  const { email, password } = req.body;

  try {
    const user = await User.login(email, password);

    // create a token
    const token = createToken(user._id);

    res.status(200).json({ email, token, role: user.role });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

// signup a user
const signupUser = async (req, res) => {
  const { email, password, fullName, phoneNumber, reportingManager, state } = req.body;

  try {
    const user = await User.signup(email, password, fullName, phoneNumber, reportingManager, state);

    res.status(200).json({ email, fullName, phoneNumber, reportingManager, role: user.role});
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

const getAllUsers = async (req, res) => {
  try {
    const users = await User.find({});
    res.status(200).json(users);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

const getUserByEmail = async (req, res) => {
  const { email } = req.query;

  try {
    const user = await User.findOne({ email }).select('-password');
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.status(200).json(user);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};


module.exports = { loginUser, signupUser, requestPasswordReset, resetPassword, getAllUsers, getUserByEmail };
