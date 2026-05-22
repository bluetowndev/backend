const express = require('express');
const router = express.Router();
const requireAuth = require('../middleware/requireAuth');

// Import controller functions
const {
  applyForLeave,
  getCurrentUserLeaves,
  getLeavesForApproval,
  approveOrRejectLeave,
  getAllLeaves,
  getLeaveStatistics
} = require('../controllers/leaveController');

// All routes require authentication
router.use(requireAuth);

// User routes (role: user)
router.post('/apply', applyForLeave);
router.get('/my-leaves', getCurrentUserLeaves);

// State head routes (role: statehead)
router.get('/for-approval', getLeavesForApproval);
router.post('/approve-reject', approveOrRejectLeave);

// Admin routes (role: admin)
router.get('/all', getAllLeaves);
router.get('/statistics', getLeaveStatistics);

module.exports = router;

