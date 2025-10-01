const SiteAllocation = require('../models/siteAllocationModel');
const User = require('../models/userModel');

// Get site allocations for a user by email
const getSiteAllocationsByEmail = async (req, res) => {
  try {
    const { email } = req.query;

    if (!email) {
      return res.status(400).json({ error: 'Email is required' });
    }

    // Find user by email
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Find site allocations for the user
    let siteAllocation = await SiteAllocation.findOne({ user: user._id }).populate('user', 'email fullName phoneNumber reportingManager state');

    // If no site allocation exists, create an empty one
    if (!siteAllocation) {
      siteAllocation = new SiteAllocation({
        user: user._id,
        sites: []
      });
      await siteAllocation.save();
      siteAllocation = await SiteAllocation.findOne({ user: user._id }).populate('user', 'email fullName phoneNumber reportingManager state');
    }

    res.status(200).json({
      success: true,
      data: siteAllocation
    });
  } catch (error) {
    console.error('Error fetching site allocations:', error);
    res.status(500).json({ error: 'Failed to fetch site allocations' });
  }
};

// Add a site to user's allocation
const addSiteToUser = async (req, res) => {
  try {
    const { email, siteName, district, state } = req.body;

    if (!email || !siteName || !district || !state) {
      return res.status(400).json({ error: 'Email, site name, district, and state are required' });
    }

    // Find user by email
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Check if site already exists for this user
    let siteAllocation = await SiteAllocation.findOne({ user: user._id });
    
    if (!siteAllocation) {
      // Create new site allocation
      siteAllocation = new SiteAllocation({
        user: user._id,
        sites: []
      });
    }

    // Check if site already exists
    const siteExists = siteAllocation.sites.some(site => 
      site.siteName.toLowerCase() === siteName.toLowerCase() &&
      site.district.toLowerCase() === district.toLowerCase() &&
      site.state.toLowerCase() === state.toLowerCase()
    );

    if (siteExists) {
      return res.status(400).json({ error: 'Site already allocated to this user' });
    }

    // Add new site
    siteAllocation.sites.push({
      siteName,
      district,
      state
    });

    await siteAllocation.save();

    // Fetch updated allocation with populated user data
    const updatedAllocation = await SiteAllocation.findOne({ user: user._id })
      .populate('user', 'email fullName phoneNumber reportingManager state');

    res.status(201).json({
      success: true,
      message: 'Site added successfully',
      data: updatedAllocation
    });
  } catch (error) {
    console.error('Error adding site to user:', error);
    res.status(500).json({ error: 'Failed to add site to user' });
  }
};

// Remove a site from user's allocation
const removeSiteFromUser = async (req, res) => {
  try {
    const { email, siteId } = req.body;

    if (!email || !siteId) {
      return res.status(400).json({ error: 'Email and site ID are required' });
    }

    // Find user by email
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Find site allocation
    const siteAllocation = await SiteAllocation.findOne({ user: user._id });
    if (!siteAllocation) {
      return res.status(404).json({ error: 'No site allocation found for this user' });
    }

    // Remove the site
    siteAllocation.sites = siteAllocation.sites.filter(site => site._id.toString() !== siteId);
    await siteAllocation.save();

    // Fetch updated allocation with populated user data
    const updatedAllocation = await SiteAllocation.findOne({ user: user._id })
      .populate('user', 'email fullName phoneNumber reportingManager state');

    res.status(200).json({
      success: true,
      message: 'Site removed successfully',
      data: updatedAllocation
    });
  } catch (error) {
    console.error('Error removing site from user:', error);
    res.status(500).json({ error: 'Failed to remove site from user' });
  }
};

// Get all site allocations (for admin overview)
const getAllSiteAllocations = async (req, res) => {
  try {
    const siteAllocations = await SiteAllocation.find()
      .populate('user', 'email fullName phoneNumber reportingManager state')
      .sort({ updatedAt: -1 });

    res.status(200).json({
      success: true,
      data: siteAllocations
    });
  } catch (error) {
    console.error('Error fetching all site allocations:', error);
    res.status(500).json({ error: 'Failed to fetch site allocations' });
  }
};

module.exports = {
  getSiteAllocationsByEmail,
  addSiteToUser,
  removeSiteFromUser,
  getAllSiteAllocations
};
