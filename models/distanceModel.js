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
    type: Number, // Store total distance in kilometers
    required: true,
  },
  pointToPointDistances: [
    {
      from: String, // Optional: From location or timestamp
      to: String,   // Optional: To location or timestamp
      distance: Number, // Distance in meters or km
    },
  ],
});

module.exports = mongoose.model('TotalDistance', totalDistanceSchema);
