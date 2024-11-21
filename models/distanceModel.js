const mongoose = require('mongoose');

const totalDistanceSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  date: {
    type: String, // Use ISO format 'YYYY-MM-DD'
    required: true,
  },
  totalDistance: {
    type: Number, // Store distance in meters
    required: true,
  },
});

module.exports = mongoose.model('TotalDistance', totalDistanceSchema);
