const mongoose = require('mongoose');

const siteVisitSummarySchema = new mongoose.Schema({
  attendance: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Attendance',
    required: true
  },
  visitType: {
    type: String,
    enum: ['Tower End (TE)', 'Customer End (CE)'],
    required: true
  },
  issue: {
    type: String,
    required: true
  },
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

const SiteVisitSummary = mongoose.model('SiteVisitSummary', siteVisitSummarySchema);

module.exports = SiteVisitSummary; 