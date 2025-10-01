const mongoose = require('mongoose');

const siteAllocationSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  sites: [{
    siteName: {
      type: String,
      required: true
    },
    district: {
      type: String,
      required: true
    },
    state: {
      type: String,
      required: true
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
siteAllocationSchema.pre('save', function(next) {
  this.updatedAt = new Date();
  next();
});

const SiteAllocation = mongoose.model('SiteAllocation', siteAllocationSchema);

module.exports = SiteAllocation;
