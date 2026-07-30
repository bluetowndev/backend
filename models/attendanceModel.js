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
  purpose: {
    type: String,
    required: true,
  },
  subPurpose: { type: String },
  feedback: {
    type: String,
    maxlength: 200,
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

attendanceSchema.index({ user: 1, date: 1 });
attendanceSchema.index(
  { user: 1, date: 1, purpose: 1 },
  {
    unique: true,
    partialFilterExpression: {
      purpose: { $in: ['Check In', 'Check Out', 'On Leave'] }
    }
  }
);

const Attendance = mongoose.model('Attendance', attendanceSchema);

module.exports = Attendance;
