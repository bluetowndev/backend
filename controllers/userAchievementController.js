const UserAchievement = require('../models/userAchievementModel');
const User = require('../models/userModel');

// Get user achievements by email
const getUserAchievementsByEmail = async (req, res) => {
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

    // Find user achievements
    let userAchievements = await UserAchievement.findOne({ user: user._id }).populate('user', 'email fullName phoneNumber reportingManager state');

    // If no achievements exist, create an empty one
    if (!userAchievements) {
      userAchievements = new UserAchievement({
        user: user._id,
        achievements: []
      });
      await userAchievements.save();
      userAchievements = await UserAchievement.findOne({ user: user._id }).populate('user', 'email fullName phoneNumber reportingManager state');
    }

    res.status(200).json({
      success: true,
      data: userAchievements
    });
  } catch (error) {
    console.error('Error fetching user achievements:', error);
    res.status(500).json({ error: 'Failed to fetch user achievements' });
  }
};

// Get current user's achievements (for authenticated user)
const getCurrentUserAchievements = async (req, res) => {
  try {
    // Check if user is authenticated
    if (!req.user || !req.user._id) {
      return res.status(401).json({ error: 'User not authenticated' });
    }
    
    const userId = req.user._id;

    // Find user achievements
    let userAchievements = await UserAchievement.findOne({ user: userId }).populate('user', 'email fullName phoneNumber reportingManager state');

    // If no achievements exist, create an empty one
    if (!userAchievements) {
      userAchievements = new UserAchievement({
        user: userId,
        achievements: []
      });
      await userAchievements.save();
      userAchievements = await UserAchievement.findOne({ user: userId }).populate('user', 'email fullName phoneNumber reportingManager state');
    }

    // console.log('Current user achievements response:', {
    //   userId,
    //   hasAchievements: !!userAchievements,
    //   achievementsCount: userAchievements?.achievements?.length || 0,
    //   achievements: userAchievements?.achievements
    // });

    res.status(200).json({
      success: true,
      data: userAchievements
    });
  } catch (error) {
    console.error('Error fetching current user achievements:', error);
    res.status(500).json({ error: 'Failed to fetch user achievements' });
  }
};

// Add or update achievement for a user
const addOrUpdateAchievement = async (req, res) => {
  try {
    const { email, month, year, achievement } = req.body;

    if (!email || !month || !year || achievement === undefined) {
      return res.status(400).json({ error: 'Email, month, year, and achievement are required' });
    }

    // Find user by email
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Find or create user achievements
    let userAchievements = await UserAchievement.findOne({ user: user._id });
    
    if (!userAchievements) {
      userAchievements = new UserAchievement({
        user: user._id,
        achievements: []
      });
    }

    // Check if achievement already exists for this month/year
    const existingAchievementIndex = userAchievements.achievements.findIndex(
      a => a.month === month && a.year === year
    );

    if (existingAchievementIndex !== -1) {
      // Update existing achievement
      userAchievements.achievements[existingAchievementIndex].achievement = achievement;
    } else {
      // Add new achievement
      userAchievements.achievements.push({
        month,
        year,
        achievement
      });
    }

    await userAchievements.save();

    // Fetch updated achievements with populated user data
    const updatedAchievements = await UserAchievement.findOne({ user: user._id })
      .populate('user', 'email fullName phoneNumber reportingManager state');

    res.status(201).json({
      success: true,
      message: 'Achievement added/updated successfully',
      data: updatedAchievements
    });
  } catch (error) {
    console.error('Error adding/updating achievement:', error);
    res.status(500).json({ error: 'Failed to add/update achievement' });
  }
};

// Bulk import achievements from Excel data
const bulkImportAchievements = async (req, res) => {
  try {
    const { achievementsData } = req.body; // Array of { email, september2025 }

    if (!Array.isArray(achievementsData) || achievementsData.length === 0) {
      return res.status(400).json({ error: 'Achievements data array is required' });
    }

    const results = [];
    const errors = [];

    for (const achievementData of achievementsData) {
      try {
        const { email, september2025, october2025, november2025 } = achievementData;

        if (!email) {
          errors.push({ email: 'N/A', error: 'Email is required' });
          continue;
        }

        // Find user by email
        const user = await User.findOne({ email });
        if (!user) {
          errors.push({ email, error: 'User not found' });
          continue;
        }

        // Find or create user achievements
        let userAchievements = await UserAchievement.findOne({ user: user._id });
        
        if (!userAchievements) {
          userAchievements = new UserAchievement({
            user: user._id,
            achievements: []
          });
        }

        // Add/update achievement for September 2025
        if (september2025 !== undefined && september2025 !== null && september2025 !== '') {
          const existingAchievementIndex = userAchievements.achievements.findIndex(
            a => a.month === 'September' && a.year === 2025
          );

          if (existingAchievementIndex !== -1) {
            userAchievements.achievements[existingAchievementIndex].achievement = september2025;
          } else {
            userAchievements.achievements.push({ 
              month: 'September', 
              year: 2025, 
              achievement: september2025 
            });
          }
        }

        // Add/update achievement for October 2025
        if (october2025 !== undefined && october2025 !== null && october2025 !== '') {
          const existingAchievementIndex = userAchievements.achievements.findIndex(
            a => a.month === 'October' && a.year === 2025
          );

          if (existingAchievementIndex !== -1) {
            userAchievements.achievements[existingAchievementIndex].achievement = october2025;
          } else {
            userAchievements.achievements.push({ 
              month: 'October', 
              year: 2025, 
              achievement: october2025 
            });
          }
        }

        // Add/update achievement for November 2025
        if (november2025 !== undefined && november2025 !== null && november2025 !== '') {
          const existingAchievementIndex = userAchievements.achievements.findIndex(
            a => a.month === 'November' && a.year === 2025
          );

          if (existingAchievementIndex !== -1) {
            userAchievements.achievements[existingAchievementIndex].achievement = november2025;
          } else {
            userAchievements.achievements.push({ 
              month: 'November', 
              year: 2025, 
              achievement: november2025 
            });
          }
        }

        await userAchievements.save();
        results.push({ email, status: 'success' });
      } catch (error) {
        errors.push({ email: achievementData.email || 'Unknown', error: error.message });
      }
    }

    res.status(200).json({
      success: true,
      message: 'Bulk import completed',
      results,
      errors
    });
  } catch (error) {
    console.error('Error in bulk import:', error);
    res.status(500).json({ error: 'Failed to import achievements' });
  }
};

// Remove an achievement
const removeAchievement = async (req, res) => {
  try {
    const { email, month, year } = req.body;

    if (!email || !month || !year) {
      return res.status(400).json({ error: 'Email, month, and year are required' });
    }

    // Find user by email
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Find user achievements
    const userAchievements = await UserAchievement.findOne({ user: user._id });
    if (!userAchievements) {
      return res.status(404).json({ error: 'No achievements found for this user' });
    }

    // Remove the achievement
    userAchievements.achievements = userAchievements.achievements.filter(
      a => !(a.month === month && a.year === year)
    );

    await userAchievements.save();

    // Fetch updated achievements with populated user data
    const updatedAchievements = await UserAchievement.findOne({ user: user._id })
      .populate('user', 'email fullName phoneNumber reportingManager state');

    res.status(200).json({
      success: true,
      message: 'Achievement removed successfully',
      data: updatedAchievements
    });
  } catch (error) {
    console.error('Error removing achievement:', error);
    res.status(500).json({ error: 'Failed to remove achievement' });
  }
};

// Get all user achievements (for admin overview)
const getAllUserAchievements = async (req, res) => {
  try {
    const userAchievements = await UserAchievement.find()
      .populate('user', 'email fullName phoneNumber reportingManager state')
      .sort({ updatedAt: -1 });

    res.status(200).json({
      success: true,
      data: userAchievements
    });
  } catch (error) {
    console.error('Error fetching all user achievements:', error);
    res.status(500).json({ error: 'Failed to fetch user achievements' });
  }
};

module.exports = {
  getUserAchievementsByEmail,
  getCurrentUserAchievements,
  addOrUpdateAchievement,
  bulkImportAchievements,
  removeAchievement,
  getAllUserAchievements
};
