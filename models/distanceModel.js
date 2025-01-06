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
      from: {
        type: String, // Start location name
        required: true,
      },
      to: {
        type: String, // End location name
        required: true,
      },
      distance: {
        type: Number, // Distance in kilometers
        required: true,
      },
      transitTime: {
        type: String, // Transit time (e.g., "30 mins")
        required: true,
      },
    },
  ],
});

module.exports = mongoose.model('TotalDistance', totalDistanceSchema);
