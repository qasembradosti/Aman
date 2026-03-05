import db from '../config/knex.js';

const Wallet = {
  getByUserId: async (userId, trx = db) => trx('wallets').where({ user_id: userId }).first(),

  createIfMissing: async (userId, currency = 'USD', trx = db) => {
    const existing = await Wallet.getByUserId(userId, trx);
    if (existing) return existing;
    
    try {
      const [id] = await trx('wallets').insert({ user_id: userId, balance: 0, currency });
      return await trx('wallets').where({ id }).first();
    } catch (err) {
      // Handle duplicate key error (race condition)
      if (err.code === 'ER_DUP_ENTRY' || err.errno === 1062 || err.message.includes('UNIQUE constraint failed')) {
        console.log(`Wallet already exists for user ${userId}, fetching existing wallet`);
        return await Wallet.getByUserId(userId, trx);
      }
      throw err;
    }
  },

  credit: async (userId, amount, reference = null, metadata = null) => {
    return db.transaction(async (trx) => {
      const wallet = await Wallet.createIfMissing(userId, 'USD', trx);
      const newBalance = Number(wallet.balance) + Number(amount);
      await trx('wallets').where({ id: wallet.id }).update({ balance: newBalance });
      const [txId] = await trx('wallet_transactions').insert({
        wallet_id: wallet.id,
        type: 'credit',
        amount,
        reference,
        metadata: metadata ? JSON.stringify(metadata) : null,
      });
      const tx = await trx('wallet_transactions').where({ id: txId }).first();
      return { balance: newBalance, transaction: tx };
    });
  },

  debit: async (userId, amount, reference = null, metadata = null) => {
    return db.transaction(async (trx) => {
      const wallet = await Wallet.createIfMissing(userId, 'USD', trx);
      const current = Number(wallet.balance);
      if (current < Number(amount)) {
        const err = new Error('Insufficient wallet balance');
        err.code = 'WALLET_INSUFFICIENT_FUNDS';
        throw err;
      }
      const newBalance = current - Number(amount);
      await trx('wallets').where({ id: wallet.id }).update({ balance: newBalance });
      const [txId] = await trx('wallet_transactions').insert({
        wallet_id: wallet.id,
        type: 'debit',
        amount,
        reference,
        metadata: metadata ? JSON.stringify(metadata) : null,
      });
      const tx = await trx('wallet_transactions').where({ id: txId }).first();
      return { balance: newBalance, transaction: tx };
    });
  },

  listTransactions: async (userId, limit = 20, offset = 0) => {
    const wallet = await Wallet.getByUserId(userId);
    if (!wallet) return [];
    return db('wallet_transactions')
      .where({ wallet_id: wallet.id })
      .orderBy('created_at', 'desc')
      .limit(limit)
      .offset(offset);
  },

  // Leaderboard: top users by wallet balance
  topBalances: async (limit = 10, offset = 0) => {
    return db('wallets')
      .join('users', 'users.id', 'wallets.user_id')
      .where('users.role', '!=', 'superadmin')
      .select('users.id as id', 'users.username', 'users.first_name', 'wallets.balance')
      .orderBy('wallets.balance', 'desc')
      .limit(limit)
      .offset(offset);
  },
  // Period leaderboard based on net change (credits - debits) in current week/month
  periodTopBalances: async (period = 'weekly', limit = 10, offset = 0) => {
    // Build date filter for MySQL compatible dialects. For SQLite/Postgres adjust accordingly.
    let whereRaw;
    if (period === 'weekly') {
      // ISO week (mode 1)
      whereRaw = db.raw('YEARWEEK(wt.created_at, 1) = YEARWEEK(CURDATE(), 1)');
    } else if (period === 'monthly') {
      whereRaw = db.raw('YEAR(wt.created_at) = YEAR(CURDATE()) AND MONTH(wt.created_at) = MONTH(CURDATE())');
    } else if (period === 'yearly') {
      whereRaw = db.raw('YEAR(wt.created_at) = YEAR(CURDATE())');
    } else {
      // Fallback to all-time net change (same as balance ordering but via transactions)
      whereRaw = db.raw('1=1');
    }

    return db('wallet_transactions as wt')
      .join('wallets as w', 'wt.wallet_id', 'w.id')
      .join('users', 'users.id', 'w.user_id')
      .where(whereRaw)
      .where('users.role', '!=', 'superadmin')
      .groupBy('users.id', 'users.username', 'users.first_name')
      .select(
        'users.id as id',
        'users.username',
        'users.first_name',
        db.raw('SUM(CASE WHEN wt.type = "credit" THEN wt.amount ELSE -wt.amount END) as net_change'),
        db.raw('MAX(w.balance) as balance')
      )
      .orderBy('net_change', 'desc')
      .limit(limit)
      .offset(offset);
  },
};

export default Wallet;
