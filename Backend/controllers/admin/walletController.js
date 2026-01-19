import Wallet from '../../models/wallet.js';
import User from '../../models/user.js';
import db from '../../config/knex.js';

// Get all user wallets (admin only)
export const getAllWallets = async (req, res) => {
  try {
    const { page = 1, limit = 20, search = '' } = req.query;
    const offset = (page - 1) * limit;

    // Base query for wallets
    let baseQuery = db('wallets')
      .leftJoin('users', 'wallets.user_id', 'users.id');

    // Apply search filter if provided
    if (search) {
      baseQuery = baseQuery.where(function() {
        this.where('users.username', 'like', `%${search}%`)
          .orWhere('users.email', 'like', `%${search}%`)
          .orWhere('users.phone', 'like', `%${search}%`)
          .orWhere('users.first_name', 'like', `%${search}%`)
          .orWhere('users.last_name', 'like', `%${search}%`)
          .orWhere('wallets.user_id', search);
      });
    }

    // Get wallets with pagination
    const wallets = await baseQuery.clone()
      .select(
        'wallets.id',
        'wallets.user_id',
        'wallets.balance',
        'wallets.currency',
        'wallets.created_at',
        'wallets.updated_at',
        'users.username',
        'users.email',
        'users.first_name',
        'users.last_name',
        'users.phone'
      )
      .orderBy('wallets.created_at', 'desc')
      .limit(limit)
      .offset(offset);

    // Get total count separately
    const [{ total }] = await baseQuery.clone()
      .count('wallets.id as total');

    res.json({
      wallets,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: parseInt(total),
        totalPages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('Error fetching wallets:', error);
    res.status(500).json({ 
      message: 'Failed to fetch wallets', 
      error: error.message 
    });
  }
};

// Get single wallet by user ID
export const getWalletByUserId = async (req, res) => {
  try {
    const { userId } = req.params;

    const wallet = await db('wallets')
      .select(
        'wallets.*',
        'users.username',
        'users.email',
        'users.first_name',
        'users.last_name',
        'users.phone'
      )
      .leftJoin('users', 'wallets.user_id', 'users.id')
      .where('wallets.user_id', userId)
      .first();

    if (!wallet) {
      return res.status(404).json({ message: 'Wallet not found' });
    }

    // Get recent transactions
    const transactions = await db('wallet_transactions')
      .where('wallet_id', wallet.id)
      .orderBy('created_at', 'desc')
      .limit(20);

    res.json({ wallet, transactions });
  } catch (error) {
    console.error('Error fetching wallet:', error);
    res.status(500).json({ 
      message: 'Failed to fetch wallet', 
      error: error.message 
    });
  }
};

// Add money to user wallet (admin only)
export const creditUserWallet = async (req, res) => {
  try {
    const { userId } = req.params;
    const { amount, reference, note } = req.body;

    if (!amount || amount <= 0) {
      return res.status(400).json({ message: 'Amount must be greater than 0' });
    }

    // Check if user exists
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Create wallet if missing and credit it
    const metadata = {
      admin_id: req.user?.userId,
      admin_username: req.user?.username,
      note: note || 'Admin credit',
      timestamp: new Date().toISOString()
    };

    const result = await Wallet.credit(
      userId, 
      amount, 
      reference || 'ADMIN_CREDIT',
      metadata
    );

    res.json({
      message: 'Wallet credited successfully',
      balance: result.balance,
      transaction: result.transaction
    });
  } catch (error) {
    console.error('Error crediting wallet:', error);
    res.status(500).json({ 
      message: 'Failed to credit wallet', 
      error: error.message 
    });
  }
};

// Deduct money from user wallet (admin only)
export const debitUserWallet = async (req, res) => {
  try {
    const { userId } = req.params;
    const { amount, reference, note } = req.body;

    if (!amount || amount <= 0) {
      return res.status(400).json({ message: 'Amount must be greater than 0' });
    }

    // Check if user exists
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    const metadata = {
      admin_id: req.user?.userId,
      admin_username: req.user?.username,
      note: note || 'Admin debit',
      timestamp: new Date().toISOString()
    };

    const result = await Wallet.debit(
      userId, 
      amount, 
      reference || 'ADMIN_DEBIT',
      metadata
    );

    res.json({
      message: 'Wallet debited successfully',
      balance: result.balance,
      transaction: result.transaction
    });
  } catch (error) {
    if (error.code === 'WALLET_INSUFFICIENT_FUNDS') {
      return res.status(400).json({ 
        message: 'Insufficient wallet balance', 
        error: error.message 
      });
    }
    console.error('Error debiting wallet:', error);
    res.status(500).json({ 
      message: 'Failed to debit wallet', 
      error: error.message 
    });
  }
};

// Get wallet statistics (admin only)
export const getWalletStats = async (req, res) => {
  try {
    const [
      { total: totalWallets },
      { total_balance: totalBalance },
      { avg_balance: avgBalance },
      topWallets
    ] = await Promise.all([
      db('wallets').count('* as total').first(),
      db('wallets').sum('balance as total_balance').first(),
      db('wallets').avg('balance as avg_balance').first(),
      db('wallets')
        .join('users', 'wallets.user_id', 'users.id')
        .select(
          'wallets.user_id',
          'wallets.balance',
          'users.username',
          'users.email'
        )
        .orderBy('wallets.balance', 'desc')
        .limit(10)
    ]);

    res.json({
      totalWallets,
      totalBalance: parseFloat(totalBalance) || 0,
      avgBalance: parseFloat(avgBalance) || 0,
      topWallets
    });
  } catch (error) {
    console.error('Error fetching wallet stats:', error);
    res.status(500).json({ 
      message: 'Failed to fetch wallet statistics', 
      error: error.message 
    });
  }
};
