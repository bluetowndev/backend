const UserTarget = require('../models/userTargetModel');
const User = require('../models/userModel');

// Get user targets by email
const getUserTargetsByEmail = async (req, res) => {
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

    // Find user targets
    let userTargets = await UserTarget.findOne({ user: user._id }).populate('user', 'email fullName phoneNumber reportingManager state');

    // If no targets exist, create an empty one
    if (!userTargets) {
      userTargets = new UserTarget({
        user: user._id,
        targets: []
      });
      await userTargets.save();
      userTargets = await UserTarget.findOne({ user: user._id }).populate('user', 'email fullName phoneNumber reportingManager state');
    }

    res.status(200).json({
      success: true,
      data: userTargets
    });
  } catch (error) {
    console.error('Error fetching user targets:', error);
    res.status(500).json({ error: 'Failed to fetch user targets' });
  }
};

// Get current user's targets (for authenticated user)
const getCurrentUserTargets = async (req, res) => {
  try {
    const userId = req.user._id;

    // Find user targets
    let userTargets = await UserTarget.findOne({ user: userId }).populate('user', 'email fullName phoneNumber reportingManager state');

    // If no targets exist, create an empty one
    if (!userTargets) {
      userTargets = new UserTarget({
        user: userId,
        targets: []
      });
      await userTargets.save();
      userTargets = await UserTarget.findOne({ user: userId }).populate('user', 'email fullName phoneNumber reportingManager state');
    }

    res.status(200).json({
      success: true,
      data: userTargets
    });
  } catch (error) {
    console.error('Error fetching current user targets:', error);
    res.status(500).json({ error: 'Failed to fetch user targets' });
  }
};

// Add or update target for a user
const addOrUpdateTarget = async (req, res) => {
  try {
    const { email, month, year, target } = req.body;

    if (!email || !month || !year || target === undefined) {
      return res.status(400).json({ error: 'Email, month, year, and target are required' });
    }

    // Find user by email
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Find or create user targets
    let userTargets = await UserTarget.findOne({ user: user._id });
    
    if (!userTargets) {
      userTargets = new UserTarget({
        user: user._id,
        targets: []
      });
    }

    // Check if target already exists for this month/year
    const existingTargetIndex = userTargets.targets.findIndex(
      t => t.month === month && t.year === year
    );

    if (existingTargetIndex !== -1) {
      // Update existing target
      userTargets.targets[existingTargetIndex].target = target;
    } else {
      // Add new target
      userTargets.targets.push({
        month,
        year,
        target
      });
    }

    await userTargets.save();

    // Fetch updated targets with populated user data
    const updatedTargets = await UserTarget.findOne({ user: user._id })
      .populate('user', 'email fullName phoneNumber reportingManager state');

    res.status(201).json({
      success: true,
      message: 'Target added/updated successfully',
      data: updatedTargets
    });
  } catch (error) {
    console.error('Error adding/updating target:', error);
    res.status(500).json({ error: 'Failed to add/update target' });
  }
};

// Bulk import targets from Excel data
const bulkImportTargets = async (req, res) => {
  try {
    const { targetsData } = req.body; // Array of { email, september2025, october2025, november2025 }

    if (!Array.isArray(targetsData) || targetsData.length === 0) {
      return res.status(400).json({ error: 'Targets data array is required' });
    }

    const results = [];
    const errors = [];

    for (const targetData of targetsData) {
      try {
        const { email, september2025, october2025, november2025 } = targetData;

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

        // Find or create user targets
        let userTargets = await UserTarget.findOne({ user: user._id });
        
        if (!userTargets) {
          userTargets = new UserTarget({
            user: user._id,
            targets: []
          });
        }

        // Add/update targets for each month
        const months = [
          { month: 'September', year: 2025, target: september2025 },
          { month: 'October', year: 2025, target: october2025 },
          { month: 'November', year: 2025, target: november2025 }
        ];

        for (const { month, year, target } of months) {
          if (target !== undefined && target !== null && target !== '') {
            const existingTargetIndex = userTargets.targets.findIndex(
              t => t.month === month && t.year === year
            );

            if (existingTargetIndex !== -1) {
              userTargets.targets[existingTargetIndex].target = target;
            } else {
              userTargets.targets.push({ month, year, target });
            }
          }
        }

        await userTargets.save();
        results.push({ email, status: 'success' });
      } catch (error) {
        errors.push({ email: targetData.email || 'Unknown', error: error.message });
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
    res.status(500).json({ error: 'Failed to import targets' });
  }
};

// Remove a target
const removeTarget = async (req, res) => {
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

    // Find user targets
    const userTargets = await UserTarget.findOne({ user: user._id });
    if (!userTargets) {
      return res.status(404).json({ error: 'No targets found for this user' });
    }

    // Remove the target
    userTargets.targets = userTargets.targets.filter(
      t => !(t.month === month && t.year === year)
    );

    await userTargets.save();

    // Fetch updated targets with populated user data
    const updatedTargets = await UserTarget.findOne({ user: user._id })
      .populate('user', 'email fullName phoneNumber reportingManager state');

    res.status(200).json({
      success: true,
      message: 'Target removed successfully',
      data: updatedTargets
    });
  } catch (error) {
    console.error('Error removing target:', error);
    res.status(500).json({ error: 'Failed to remove target' });
  }
};

// Get all user targets (for admin overview)
const getAllUserTargets = async (req, res) => {
  try {
    const userTargets = await UserTarget.find()
      .populate('user', 'email fullName phoneNumber reportingManager state')
      .sort({ updatedAt: -1 });

    res.status(200).json({
      success: true,
      data: userTargets
    });
  } catch (error) {
    console.error('Error fetching all user targets:', error);
    res.status(500).json({ error: 'Failed to fetch user targets' });
  }
};

module.exports = {
  getUserTargetsByEmail,
  getCurrentUserTargets,
  addOrUpdateTarget,
  bulkImportTargets,
  removeTarget,
  getAllUserTargets
};
