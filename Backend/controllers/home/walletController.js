import Wallet from '../../models/wallet.js';
import jwt from 'jsonwebtoken';

export const getWallet = async (req, res) => {
  // Prefer query/body user_id, but fall back to JWT if available
  let userId = Number(req.query.user_id ?? req.body?.user_id);
  if (!Number.isFinite(userId)) {
    try {
      const authHeader = req.headers?.authorization;
      const token = authHeader && authHeader.split(' ')[1];
      if (token) {
        const decoded = jwt.verify(token, process.env.JWT_SECRET );
        if (decoded?.userId) userId = Number(decoded.userId);
      }
    } catch (_) {
      // ignore token errors here; we'll fall back to 400 below
    }
  }

  if (!Number.isFinite(userId) || !userId) {
    return res.status(400).json({ message: 'user_id is required' });
  }

  const attempt = async () => Wallet.createIfMissing(userId);

  try {
    const wallet = await attempt();
    return res.json(wallet);
  } catch (err) {
    // Log detailed error for diagnostics
    console.error('getWallet error', {
      userId,
      code: err?.code,
      message: err?.message,
    });

    // If tables are missing, try to create them once and retry
    const msg = String(err.message || '');
    const code = err.code;
    const missingTable = code === 'ER_NO_SUCH_TABLE' || /no such table/i.test(msg) || /does not exist/i.test(msg);
    if (missingTable) {
      try {
        const wallet = await attempt();
        return res.json(wallet);
      } catch (e2) {
        console.error('getWallet retry after ensureWalletTables failed', {
          userId,
          code: e2?.code,
          message: e2?.message,
        });
        return res.status(500).json({ message: 'Failed to fetch wallet', error: e2.message, code: e2.code });
      }
    }
    return res.status(500).json({ message: 'Failed to fetch wallet', error: err.message, code });
  }
};

export const debitWallet = async (req, res) => {
  try {
    const userId = Number(req.body.user_id);
    const amount = Number(req.body.amount);
    if (!userId || !amount) return res.status(400).json({ message: 'user_id and amount are required' });
    const result = await Wallet.debit(userId, amount, req.body.reference || null, req.body.metadata || null);
    res.status(201).json(result);
  } catch (err) {
    const status = err.code === 'WALLET_INSUFFICIENT_FUNDS' ? 409 : 400;
    res.status(status).json({ message: 'Failed to debit wallet', error: err.message, code: err.code });
  }
};

export const listWalletTransactions = async (req, res) => {
  try {
    const userId = Number(req.query.user_id || req.body.user_id);
    const limit = Number(req.query.limit || 20);
    const offset = Number(req.query.offset || 0);
    if (!userId) return res.status(400).json({ message: 'user_id is required' });
    const txs = await Wallet.listTransactions(userId, limit, offset);
    res.json(txs);
  } catch (err) {
    res.status(500).json({ message: 'Failed to fetch transactions', error: err.message });
  }
};

// Leaderboard endpoint: returns top users by balance or period net change
export const leaderboard = async (req, res) => {
  try {
    const limit = Number(req.query.limit || 50);
    const offset = Number(req.query.offset || 0);
    const period = String(req.query.period || 'all').toLowerCase(); // 'all' | 'weekly' | 'monthly' | 'yearly'

    // Ensure tables exist in case of new deployments
    try { await ensureWalletTables(); } catch (_) {}

    let rows;
    if (period === 'all' || period === 'alltime') {
      rows = await Wallet.topBalances(limit, offset);
      // shape: { id, username, first_name, balance }
      rows = rows.map((r) => ({
        id: r.id,
        username: r.username,
        first_name: r.first_name || null,
        balance: Number(r.balance),
        netChange: null,
      }));
    } else {
      const apiPeriod = ['weekly', 'monthly', 'yearly'].includes(period) ? period : 'weekly';
      const periodRows = await Wallet.periodTopBalances(apiPeriod, limit, offset);
      // shape: { id, username, first_name, net_change, balance }
      rows = periodRows.map((r) => ({
        id: r.id,
        username: r.username,
        first_name: r.first_name || null,
        balance: Number(r.balance),
        netChange: Number(r.net_change),
      }));
    }

    // add rank server-side
    const ranked = rows
      .slice()
      .sort((a, b) => {
        if (period === 'all' || period === 'alltime') {
          return Number(b.balance) - Number(a.balance);
        }
        // for period leaderboards, rank by netChange desc
        return Number(b.netChange || 0) - Number(a.netChange || 0);
      })
      .map((r, idx) => ({ ...r, rank: idx + 1 }));

    res.json(ranked);
  } catch (err) {
    console.error('leaderboard error', err);
    res.status(500).json({ message: 'Failed to fetch leaderboard', error: err.message });
  }
};
