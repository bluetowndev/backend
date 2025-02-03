const express = require('express');

// controller functions
const { loginUser, signupUser, getAllUsers, getUserByEmail, getEngineersByState, getUsersWithNoAttendanceToday, getUsersWithoutAttendanceForToday, deleteUserByEmail, updateUserByEmail } = require('../controllers/userController');

const router = express.Router();

// login route
router.post('/login', loginUser);

// signup route
router.post('/signup', signupUser);

router.get('/user-details', getUserByEmail);

router.get('/all', getAllUsers);

router.get('/engineers', getEngineersByState);

router.get('/users-without-attendance', getUsersWithoutAttendanceForToday);
router.delete('/deleteUser', deleteUserByEmail);
router.put('/updateUser', updateUserByEmail);


module.exports = router;
