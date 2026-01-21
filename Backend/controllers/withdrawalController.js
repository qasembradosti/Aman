import WithdrawalRequest from '../models/withdrawalRequest.js';
import Wallet from '../models/wallet.js';

// Get all withdrawal requests
export const getWithdrawalRequests = async (req, res) => {
  try {
    const { page = 1, limit = 20, status, user_id } = req.query;
    
    // If user_id is provided, filter by that user (for regular users viewing their own)
    // Admins can view all by not providing user_id
    const result = await WithdrawalRequest.getAll({
      page: parseInt(page),
      limit: parseInt(limit),
      status,
      userId: user_id ? parseInt(user_id) : undefined
    });

    res.json(result);
  } catch (error) {
    console.error('Error fetching withdrawal requests:', error);
    res.status(500).json({ message: 'Failed to fetch withdrawal requests', error: error.message });
  }
};

// Get single withdrawal request
export const getWithdrawalRequestById = async (req, res) => {
  try {
    const { id } = req.params;
    const request = await WithdrawalRequest.getById(id);

    if (!request) {
      return res.status(404).json({ message: 'Withdrawal request not found' });
    }

    res.json(request);
  } catch (error) {
    console.error('Error fetching withdrawal request:', error);
    res.status(500).json({ message: 'Failed to fetch withdrawal request', error: error.message });
  }
};

// Create new withdrawal request (for users)
export const createWithdrawalRequest = async (req, res) => {
  try {
    const { amount, payment_details, user_note } = req.body;
    const user_id = req.user.userId;

    // Validate amount
    if (!amount || amount <= 0) {
      return res.status(400).json({ message: 'Invalid withdrawal amount' });
    }

    // Check user's wallet balance
    const wallet = await Wallet.getByUserId(user_id);
    if (!wallet) {
      return res.status(404).json({ message: 'Wallet not found' });
    }

    if (Number(wallet.balance) < Number(amount)) {
      return res.status(400).json({ 
        message: 'Insufficient balance',
        balance: wallet.balance,
        requested: amount
      });
    }

    // Check for pending requests
    const { requests: pendingRequests } = await WithdrawalRequest.getAll({
      userId: user_id,
      status: 'pending',
      limit: 1
    });

    if (pendingRequests.length > 0) {
      return res.status(400).json({ 
        message: 'You already have a pending withdrawal request. Please wait for it to be processed.' 
      });
    }

    // Create withdrawal request
    const request = await WithdrawalRequest.create({
      user_id,
      amount,
      payment_details,
      user_note
    });

    res.status(201).json({
      message: 'Withdrawal request created successfully',
      request
    });
  } catch (error) {
    console.error('Error creating withdrawal request:', error);
    res.status(500).json({ message: 'Failed to create withdrawal request', error: error.message });
  }
};

// Approve withdrawal request (admin only)
export const approveWithdrawalRequest = async (req, res) => {
  try {
    const { id } = req.params;
    const { admin_note } = req.body;
    const adminId = req.user.userId;

    // Get request details
    const request = await WithdrawalRequest.getById(id);
    
    if (!request) {
      return res.status(404).json({ message: 'Withdrawal request not found' });
    }

    if (request.status !== 'pending') {
      return res.status(400).json({ 
        message: `Request is already ${request.status}` 
      });
    }

    // Debit (subtract money) from user's wallet
    await Wallet.debit(
      request.user_id,
      request.amount,
      `Withdrawal approved - Request #${id}`,
      { withdrawal_request_id: id, type: 'withdrawal_approved' }
    );

    // Update request status
    const updatedRequest = await WithdrawalRequest.updateStatus(
      id,
      'approved',
      adminId,
      admin_note
    );

    res.json({
      message: 'Withdrawal request approved successfully',
      request: updatedRequest
    });
  } catch (error) {
    console.error('Error approving withdrawal request:', error);
    
    if (error.code === 'WALLET_INSUFFICIENT_FUNDS') {
      return res.status(400).json({ 
        message: 'User has insufficient balance' 
      });
    }
    
    res.status(500).json({ 
      message: 'Failed to approve withdrawal request', 
      error: error.message 
    });
  }
};

// Reject withdrawal request (admin only)
export const rejectWithdrawalRequest = async (req, res) => {
  try {
    const { id } = req.params;
    const { admin_note } = req.body;
    const adminId = req.user.userId;

    const request = await WithdrawalRequest.getById(id);
    
    if (!request) {
      return res.status(404).json({ message: 'Withdrawal request not found' });
    }

    if (request.status !== 'pending') {
      return res.status(400).json({ 
        message: `Request is already ${request.status}` 
      });
    }

    const updatedRequest = await WithdrawalRequest.updateStatus(
      id,
      'rejected',
      adminId,
      admin_note || 'Request rejected by admin'
    );

    res.json({
      message: 'Withdrawal request rejected',
      request: updatedRequest
    });
  } catch (error) {
    console.error('Error rejecting withdrawal request:', error);
    res.status(500).json({ 
      message: 'Failed to reject withdrawal request', 
      error: error.message 
    });
  }
};

// Get withdrawal statistics
export const getWithdrawalStats = async (req, res) => {
  try {
    const stats = await WithdrawalRequest.getStats();
    res.json(stats);
  } catch (error) {
    console.error('Error fetching withdrawal stats:', error);
    res.status(500).json({ 
      message: 'Failed to fetch withdrawal statistics', 
      error: error.message 
    });
  }
};

// Delete withdrawal request
export const deleteWithdrawalRequest = async (req, res) => {
  try {
    const { id } = req.params;
    
    const request = await WithdrawalRequest.getById(id);
    if (!request) {
      return res.status(404).json({ message: 'Withdrawal request not found' });
    }

    // Only allow deletion of pending or rejected requests
    if (request.status === 'approved') {
      return res.status(400).json({ 
        message: 'Cannot delete approved withdrawal request' 
      });
    }

    await WithdrawalRequest.delete(id);
    
    res.json({ message: 'Withdrawal request deleted successfully' });
  } catch (error) {
    console.error('Error deleting withdrawal request:', error);
    res.status(500).json({ 
      message: 'Failed to delete withdrawal request', 
      error: error.message 
    });
  }
};
