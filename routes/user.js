const express = require('express');

// controller functions
const { loginUser, signupUser, getAllUsers, getUserByEmail, getEngineersByState } = require('../controllers/userController');

const router = express.Router();

// login route
router.post('/login', loginUser);

// signup route
router.post('/signup', signupUser);

router.get('/user-details', getUserByEmail);

router.get('/all', getAllUsers);

router.get('/engineers', getEngineersByState);


module.exports = router;
