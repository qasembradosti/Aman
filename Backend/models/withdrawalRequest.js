import db from '../config/knex.js';

const WithdrawalRequest = {
  // Get all withdrawal requests with filters
  getAll: async ({ page = 1, limit = 20, status, userId } = {}) => {
    const offset = (page - 1) * limit;
    
    let query = db('withdrawal_requests')
      .select(
        'withdrawal_requests.*',
        'users.first_name as user_first_name',
        'users.last_name as user_last_name',
        'users.email as user_email',
        'users.phone as user_phone',
        db.raw('(SELECT balance FROM wallets WHERE wallets.user_id = withdrawal_requests.user_id) as user_balance')
      )
      .leftJoin('users', 'withdrawal_requests.user_id', 'users.id');

    if (status && status !== 'all') {
      query = query.where('withdrawal_requests.status', status);
    }

    if (userId) {
      query = query.where('withdrawal_requests.user_id', userId);
    }

    const totalRow = await query.clone().clearSelect().count({ total: '*' }).first();
    const total = parseInt(totalRow.total);

    const requests = await query
      .orderBy('withdrawal_requests.created_at', 'desc')
      .limit(limit)
      .offset(offset);

    return {
      requests,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit)
      }
    };
  },

  // Get single withdrawal request by ID
  getById: async (id) => {
    const request = await db('withdrawal_requests')
      .select(
        'withdrawal_requests.*',
        'users.first_name as user_first_name',
        'users.last_name as user_last_name',
        'users.email as user_email',
        'users.phone as user_phone',
        db.raw('(SELECT balance FROM wallets WHERE wallets.user_id = withdrawal_requests.user_id) as user_balance')
      )
      .leftJoin('users', 'withdrawal_requests.user_id', 'users.id')
      .where('withdrawal_requests.id', id)
      .first();

    if (request && request.payment_details) {
      try {
        request.payment_details = JSON.parse(request.payment_details);
      } catch (e) {
        // Keep as string if JSON parse fails
      }
    }

    return request;
  },

  // Create new withdrawal request
  create: async (requestData) => {
    const { user_id, amount, payment_details, user_note } = requestData;
    
    const [id] = await db('withdrawal_requests').insert({
      user_id,
      amount,
      payment_details: payment_details ? JSON.stringify(payment_details) : null,
      user_note,
      status: 'pending',
      created_at: new Date(),
      updated_at: new Date()
    });

    return await WithdrawalRequest.getById(id);
  },

  // Update withdrawal request status
  updateStatus: async (id, status, adminId, adminNote = null) => {
    const updateData = {
      status,
      processed_by: adminId,
      processed_at: new Date(),
      updated_at: new Date()
    };

    if (adminNote) {
      updateData.admin_note = adminNote;
    }

    await db('withdrawal_requests')
      .where('id', id)
      .update(updateData);

    return await WithdrawalRequest.getById(id);
  },

  // Get statistics
  getStats: async () => {
    const stats = await db('withdrawal_requests')
      .select(
        db.raw('COUNT(*) as total_requests'),
        db.raw('SUM(CASE WHEN status = "pending" THEN 1 ELSE 0 END) as pending'),
        db.raw('SUM(CASE WHEN status = "approved" THEN 1 ELSE 0 END) as approved'),
        db.raw('SUM(CASE WHEN status = "rejected" THEN 1 ELSE 0 END) as rejected'),
        db.raw('SUM(CASE WHEN status = "pending" THEN amount ELSE 0 END) as pending_amount'),
        db.raw('SUM(CASE WHEN status = "approved" THEN amount ELSE 0 END) as approved_amount')
      )
      .first();

    return stats;
  },

  // Delete withdrawal request
  delete: async (id) => {
    return await db('withdrawal_requests').where('id', id).del();
  }
};

export default WithdrawalRequest;
