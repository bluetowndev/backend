const express = require('express');
const requireAuth = require('../middleware/requireAuth');
const { 
  getUserAchievementsByEmail, 
  getCurrentUserAchievements,
  addOrUpdateAchievement, 
  bulkImportAchievements,
  removeAchievement, 
  getAllUserAchievements 
} = require('../controllers/userAchievementController');

const router = express.Router();

// Apply authentication middleware to all routes
router.use(requireAuth);

// Get current user's achievements (for authenticated user)
router.get('/current', getCurrentUserAchievements);

// Get user achievements by email (for admin)
router.get('/user', getUserAchievementsByEmail);

// Add or update an achievement
router.post('/add', addOrUpdateAchievement);

// Bulk import achievements from Excel data
router.post('/bulk-import', bulkImportAchievements);

// Remove an achievement
router.delete('/remove', removeAchievement);

// Get all user achievements (admin overview)
router.get('/all', getAllUserAchievements);

module.exports = router;
