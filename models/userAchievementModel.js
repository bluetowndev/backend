const mongoose = require('mongoose');

const userAchievementSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  achievements: [{
    month: {
      type: String,
      required: true,
      enum: ['September', 'October', 'November', 'December', 'January', 'February', 'March', 'April', 'May', 'June', 'July', 'August']
    },
    year: {
      type: Number,
      required: true
    },
    achievement: {
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
userAchievementSchema.pre('save', function(next) {
  this.updatedAt = new Date();
  next();
});

// Ensure one achievement per user per month/year combination
userAchievementSchema.index({ user: 1, 'achievements.month': 1, 'achievements.year': 1 }, { unique: true });

const UserAchievement = mongoose.model('UserAchievement', userAchievementSchema);

module.exports = UserAchievement;
