const express = require('express');

const { loginLimiter, generalPostLimiter } = require('../middleware/rateLimiter');

const { loginUser, signupUser, getAllUsers, getUserByEmail, getEngineersByState, getUsersWithoutAttendanceForToday, deleteUserByEmail, updateUserByEmail } = require('../controllers/userController');

const router = express.Router();

// login route
router.post('/login', loginLimiter, loginUser);

// signup route
router.post('/signup', generalPostLimiter, signupUser);

router.get('/user-details', getUserByEmail);

router.get('/all', getAllUsers);

router.get('/engineers', getEngineersByState);

router.get('/users-without-attendance', getUsersWithoutAttendanceForToday);
router.delete('/deleteUser', deleteUserByEmail);
router.put('/updateUser', updateUserByEmail);


module.exports = router;
