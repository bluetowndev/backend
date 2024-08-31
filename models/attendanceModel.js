const mongoose = require('mongoose');

const attendanceSchema = new mongoose.Schema({
  image: {
    type: String,
    required: true,
  },
  location: {
    lat: {
      type: Number,
      required: true,
    },
    lng: {
      type: Number,
      required: true,
    },
  },
  locationName: {
    type: String,
    required: true,
  },
  purpose: { // New field for purpose of visit
    type: String,
    required: true,
  },
  feedback: { // New field for feedback
    type: String,
    maxlength: 50, 
  },
  timestamp: {
    type: Date,
    default: Date.now,
  },
  date: {
    type: String,
    required: true,
  },
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
});

const Attendance = mongoose.model('Attendance', attendanceSchema);

module.exports = Attendance;
