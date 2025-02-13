const User = require('../models/userModel');
const Attendance = require('../models/attendanceModel');
const jwt = require("jsonwebtoken");

const createToken = (_id) => {
  return jwt.sign({ _id }, process.env.SECRET, { expiresIn: "30d" });
};

// login a user
const loginUser = async (req, res) => {
  const { email, password } = req.body; // Remove `state` from destructuring since it's not needed in the request body

  try {
    const user = await User.login(email, password);

    // Create a token
    const token = createToken(user._id);

    // Include the user's state in the response
    res.status(200).json({ 
      email: user.email, 
      token, 
      state: user.state, // Add the state from the user object
      role: user.role 
    });
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

const getEngineersByState = async (req, res) => {
  const { state } = req.query;
  try {
    const currentMonthStart = new Date();
    currentMonthStart.setDate(1);
    const currentMonthEnd = new Date();
    currentMonthEnd.setMonth(currentMonthEnd.getMonth() + 1);
    currentMonthEnd.setDate(0); // Last day of the month

    const dates = []; // Array to hold all dates of the current month
    for (let d = currentMonthStart; d <= currentMonthEnd; d.setDate(d.getDate() + 1)) {
      dates.push(new Date(d).toISOString().split('T')[0]); // Format YYYY-MM-DD
    }

    const engineers = await User.aggregate([
      { 
        $match: { state, role: 'user' }
      },
      {
        $lookup: {
          from: 'attendances',
          localField: '_id',
          foreignField: 'user',
          as: 'attendanceEntries'
        }
      },
      {
        $project: {
          fullName: 1,
          email: 1,
          attendanceEntries: {
            $ifNull: ['$attendanceEntries', []]
          }
        }
      },
      {
        $unwind: {
          path: '$attendanceEntries',
          preserveNullAndEmptyArrays: true
        }
      },
      {
        $group: {
          _id: { user: '$_id', date: '$attendanceEntries.date' },
          fullName: { $first: '$fullName' },
          email: { $first: '$email' },
          attendanceCount: { $sum: { $cond: [{ $ifNull: ['$attendanceEntries', false] }, 1, 0] } }
        }
      },
      {
        $group: {
          _id: '$_id.user',
          fullName: { $first: '$fullName' },
          email: { $first: '$email' },
          attendanceByDate: {
            $push: {
              date: '$_id.date',
              count: '$attendanceCount'
            }
          }
        }
      }
    ]);

    res.status(200).json({ engineers, dates }); // Return both engineers and dates
  } catch (error) {
    console.error('Error fetching engineers:', error);
    res.status(500).json({ error: 'Error fetching engineers' });
  }
};

const getUsersWithoutAttendanceForToday = async (req, res) => {
  try {
    const today = new Date().toISOString().split('T')[0]; // Format YYYY-MM-DD

    // Find users who have marked attendance today
    const usersWithAttendance = await Attendance.find({ date: today }).distinct('user');

    // Find users who have not marked attendance today, excluding "Delhi" and "Denmark" (case-insensitive)
    const usersWithoutAttendance = await User.find({
      _id: { $nin: usersWithAttendance }, // Exclude users who have marked attendance
      role: 'user', // Only consider users with the 'user' role
      state: { 
        $nin: [/^delhi$/i, /^denmark$/i] // Case-insensitive exclusion for "Delhi" and "Denmark"
      }
    }).select('fullName email state'); // Select only name, email, and state

    res.status(200).json(usersWithoutAttendance);
  } catch (error) {
    console.error('Error fetching users without attendance:', error);
    res.status(500).json({ error: 'Error fetching users without attendance' });
  }
};

const deleteUserByEmail = async (req, res) => {
  const { email } = req.body;

  if (!email) {
    return res.status(400).json({ error: 'Email is required' });
  }

  try {
    const user = await User.findOneAndDelete({ email });

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.status(200).json({ message: 'User deleted successfully', user });
  } catch (error) {
    res.status(500).json({ error: 'Something went wrong' });
  }
};

const updateUserByEmail = async (req, res) => {
  const { email, fullName, phoneNumber, reportingManager, state } = req.body;

  if (!email) {
    return res.status(400).json({ error: 'Email is required' });
  }

  try {
    const updatedData = {};

    if (fullName) updatedData.fullName = fullName;
    if (phoneNumber) updatedData.phoneNumber = phoneNumber;
    if (reportingManager) updatedData.reportingManager = reportingManager;
    if (state) updatedData.state = state;

    const user = await User.findOneAndUpdate(
      { email },
      { $set: updatedData },
      { new: true, runValidators: true }
    );

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.status(200).json({ message: 'User updated successfully', user });
  } catch (error) {
    res.status(500).json({ error: 'Something went wrong' });
  }
};

module.exports = { loginUser, signupUser, getAllUsers, getUserByEmail, getEngineersByState, getUsersWithoutAttendanceForToday, deleteUserByEmail, updateUserByEmail };
