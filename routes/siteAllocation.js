const express = require('express');
const requireAuth = require('../middleware/requireAuth');
const { 
  getSiteAllocationsByEmail, 
  addSiteToUser, 
  removeSiteFromUser, 
  getAllSiteAllocations 
} = require('../controllers/siteAllocationController');

const router = express.Router();

// Apply authentication middleware to all routes
router.use(requireAuth);

// Get site allocations for a user by email
router.get('/user', getSiteAllocationsByEmail);

// Add a site to user's allocation
router.post('/add', addSiteToUser);

// Remove a site from user's allocation
router.delete('/remove', removeSiteFromUser);

// Get all site allocations (admin overview)
router.get('/all', getAllSiteAllocations);

module.exports = router;
