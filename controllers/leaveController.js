const Leave = require('../models/leaveModel');
const User = require('../models/userModel');

// Apply for leave (only for users with role 'user')
const applyForLeave = async (req, res) => {
  try {
    if (!req.user || !req.user._id) {
      return res.status(401).json({ error: 'User not authenticated' });
    }

    const userId = req.user._id;
    const { startDate, endDate, reason, leaveType } = req.body;

    // Validate required fields
    if (!startDate || !endDate || !reason) {
      return res.status(400).json({ error: 'Start date, end date, and reason are required' });
    }

    // Check if user exists and has role 'user'
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    if (user.role !== 'user') {
      return res.status(403).json({ error: 'Only users can apply for leave' });
    }

    // Validate dates
    const start = new Date(startDate);
    const end = new Date(endDate);

    if (isNaN(start.getTime()) || isNaN(end.getTime())) {
      return res.status(400).json({ error: 'Invalid date format' });
    }

    if (start >= end) {
      return res.status(400).json({ error: 'End date must be after start date' });
    }

    if (start < new Date()) {
      return res.status(400).json({ error: 'Start date cannot be in the past' });
    }

    // Create leave application
    const leave = new Leave({
      user: userId,
      startDate: start,
      endDate: end,
      reason: reason.trim(),
      leaveType: leaveType || 'Casual Leave',
      status: 'Pending'
    });

    await leave.save();

    // Populate user data for response
    const populatedLeave = await Leave.findById(leave._id).populate('user', 'email fullName phoneNumber reportingManager state');

    res.status(201).json({
      success: true,
      message: 'Leave application submitted successfully',
      data: populatedLeave
    });
  } catch (error) {
    console.error('Error applying for leave:', error);
    res.status(500).json({ error: 'Failed to apply for leave' });
  }
};

// Get current user's leave applications
const getCurrentUserLeaves = async (req, res) => {
  try {
    if (!req.user || !req.user._id) {
      return res.status(401).json({ error: 'User not authenticated' });
    }

    const userId = req.user._id;
    const leaves = await Leave.find({ user: userId })
      .populate('user', 'email fullName phoneNumber reportingManager state')
      .populate('approver', 'email fullName')
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      data: leaves
    });
  } catch (error) {
    console.error('Error fetching user leaves:', error);
    res.status(500).json({ error: 'Failed to fetch leave applications' });
  }
};

// Get leaves for state head to approve/reject (for users in their state)
const getLeavesForApproval = async (req, res) => {
  try {
    if (!req.user || !req.user._id) {
      return res.status(401).json({ error: 'User not authenticated' });
    }

    const approverId = req.user._id;
    const approver = await User.findById(approverId);

    if (!approver || approver.role !== 'statehead') {
      return res.status(403).json({ error: 'Only state heads can view leaves for approval' });
    }

    // Get all pending leaves for users in the same state as the state head
    const leaves = await Leave.find({ 
      status: 'Pending'
    })
      .populate({
        path: 'user',
        match: { state: approver.state },
        select: 'email fullName phoneNumber reportingManager state'
      })
      .populate('approver', 'email fullName')
      .sort({ createdAt: -1 });

    // Filter out leaves where user is null (users from different states)
    const filteredLeaves = leaves.filter(leave => leave.user !== null);

    res.status(200).json({
      success: true,
      data: filteredLeaves
    });
  } catch (error) {
    console.error('Error fetching leaves for approval:', error);
    res.status(500).json({ error: 'Failed to fetch leaves for approval' });
  }
};

// Approve or reject leave (only for state heads)
const approveOrRejectLeave = async (req, res) => {
  try {
    if (!req.user || !req.user._id) {
      return res.status(401).json({ error: 'User not authenticated' });
    }

    const approverId = req.user._id;
    const { leaveId, action, rejectionReason } = req.body;

    if (!leaveId || !action) {
      return res.status(400).json({ error: 'Leave ID and action are required' });
    }

    if (!['approve', 'reject'].includes(action)) {
      return res.status(400).json({ error: 'Action must be either "approve" or "reject"' });
    }

    // Check if approver is a state head
    const approver = await User.findById(approverId);
    if (!approver || approver.role !== 'statehead') {
      return res.status(403).json({ error: 'Only state heads can approve or reject leaves' });
    }

    // Find the leave
    const leave = await Leave.findById(leaveId).populate('user', 'state');
    if (!leave) {
      return res.status(404).json({ error: 'Leave application not found' });
    }

    // Check if leave is still pending
    if (leave.status !== 'Pending') {
      return res.status(400).json({ error: 'Leave application has already been processed' });
    }

    // Check if the leave belongs to a user in the same state
    if (leave.user.state !== approver.state) {
      return res.status(403).json({ error: 'You can only approve/reject leaves for users in your state' });
    }

    // Update leave status
    if (action === 'approve') {
      leave.status = 'Approved';
      leave.approver = approverId;
      leave.approvedAt = new Date();
      leave.rejectionReason = null;
    } else {
      leave.status = 'Rejected';
      leave.approver = approverId;
      leave.approvedAt = new Date();
      leave.rejectionReason = rejectionReason || 'No reason provided';
    }

    await leave.save();

    // Populate for response
    const populatedLeave = await Leave.findById(leave._id)
      .populate('user', 'email fullName phoneNumber reportingManager state')
      .populate('approver', 'email fullName');

    res.status(200).json({
      success: true,
      message: `Leave ${action === 'approve' ? 'approved' : 'rejected'} successfully`,
      data: populatedLeave
    });
  } catch (error) {
    console.error('Error approving/rejecting leave:', error);
    res.status(500).json({ error: 'Failed to process leave application' });
  }
};

// Get all leaves (for admin)
const getAllLeaves = async (req, res) => {
  try {
    if (!req.user || !req.user._id) {
      return res.status(401).json({ error: 'User not authenticated' });
    }

    const adminId = req.user._id;
    const admin = await User.findById(adminId);

    if (!admin || admin.role !== 'admin') {
      return res.status(403).json({ error: 'Only admins can view all leaves' });
    }

    const { status, startDate, endDate } = req.query;

    // Build query
    let query = {};
    if (status && ['Pending', 'Approved', 'Rejected'].includes(status)) {
      query.status = status;
    }
    if (startDate || endDate) {
      query.createdAt = {};
      if (startDate) {
        query.createdAt.$gte = new Date(startDate);
      }
      if (endDate) {
        query.createdAt.$lte = new Date(endDate);
      }
    }

    const leaves = await Leave.find(query)
      .populate('user', 'email fullName phoneNumber reportingManager state')
      .populate('approver', 'email fullName')
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      data: leaves
    });
  } catch (error) {
    console.error('Error fetching all leaves:', error);
    res.status(500).json({ error: 'Failed to fetch leaves' });
  }
};

// Get leave statistics (for admin)
const getLeaveStatistics = async (req, res) => {
  try {
    if (!req.user || !req.user._id) {
      return res.status(401).json({ error: 'User not authenticated' });
    }

    const adminId = req.user._id;
    const admin = await User.findById(adminId);

    if (!admin || admin.role !== 'admin') {
      return res.status(403).json({ error: 'Only admins can view leave statistics' });
    }

    const totalLeaves = await Leave.countDocuments();
    const pendingLeaves = await Leave.countDocuments({ status: 'Pending' });
    const approvedLeaves = await Leave.countDocuments({ status: 'Approved' });
    const rejectedLeaves = await Leave.countDocuments({ status: 'Rejected' });

    res.status(200).json({
      success: true,
      data: {
        total: totalLeaves,
        pending: pendingLeaves,
        approved: approvedLeaves,
        rejected: rejectedLeaves
      }
    });
  } catch (error) {
    console.error('Error fetching leave statistics:', error);
    res.status(500).json({ error: 'Failed to fetch leave statistics' });
  }
};

module.exports = {
  applyForLeave,
  getCurrentUserLeaves,
  getLeavesForApproval,
  approveOrRejectLeave,
  getAllLeaves,
  getLeaveStatistics
};

