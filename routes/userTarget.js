const express = require('express');
const requireAuth = require('../middleware/requireAuth');
const { 
  getUserTargetsByEmail, 
  getCurrentUserTargets,
  addOrUpdateTarget, 
  bulkImportTargets,
  removeTarget, 
  getAllUserTargets 
} = require('../controllers/userTargetController');

const router = express.Router();

// Apply authentication middleware to all routes
router.use(requireAuth);

// Get current user's targets (for authenticated user)
router.get('/current', getCurrentUserTargets);

// Get user targets by email (for admin)
router.get('/user', getUserTargetsByEmail);

// Add or update a target
router.post('/add', addOrUpdateTarget);

// Bulk import targets from Excel data
router.post('/bulk-import', bulkImportTargets);

// Remove a target
router.delete('/remove', removeTarget);

// Get all user targets (admin overview)
router.get('/all', getAllUserTargets);

module.exports = router;
