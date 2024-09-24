const User = require('../models/userModel');
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



module.exports = { loginUser, signupUser, getAllUsers, getUserByEmail, getEngineersByState };
