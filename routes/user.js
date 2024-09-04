const express = require('express');

// controller functions
const { loginUser, signupUser, requestPasswordReset, resetPassword, getAllUsers, getUserByEmail } = require('../controllers/userController');

const router = express.Router();

// login route
router.post('/login', loginUser);

// signup route
router.post('/signup', signupUser);

router.get('/user-details', getUserByEmail);

router.get('/all', getAllUsers);

module.exports = router;
