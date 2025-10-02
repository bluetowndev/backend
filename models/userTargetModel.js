const mongoose = require('mongoose');

const userTargetSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  targets: [{
    month: {
      type: String,
      required: true,
      enum: ['September', 'October', 'November', 'December', 'January', 'February', 'March', 'April', 'May', 'June', 'July', 'August']
    },
    year: {
      type: Number,
      required: true
    },
    target: {
      type: Number,
      required: true,
      min: 0
    },
    createdAt: {
      type: Date,
      default: Date.now
    }
  }],
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

// Update the updatedAt field before saving
userTargetSchema.pre('save', function(next) {
  this.updatedAt = new Date();
  next();
});

// Ensure one target per user per month/year combination
userTargetSchema.index({ user: 1, 'targets.month': 1, 'targets.year': 1 }, { unique: true });

const UserTarget = mongoose.model('UserTarget', userTargetSchema);

module.exports = UserTarget;
