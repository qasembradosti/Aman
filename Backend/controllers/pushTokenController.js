import db from '../config/knex.js';

/**
 * Register or update user's push token
 */
export const registerPushToken = async (req, res) => {
  try {
    const userId = req.user.userId;
    const { push_token } = req.body;

    if (!push_token) {
      return res.status(400).json({ message: 'push_token is required' });
    }

    console.log(`📱 Registering push token for user ${userId}:`, push_token);

    // Update user's push token
    await db('users')
      .where({ id: userId })
      .update({ 
        push_token,
        updated_at: db.fn.now()
      });

    console.log(` Push token registered for user ${userId}`);

    res.json({ 
      message: 'Push token registered successfully',
      push_token 
    });
  } catch (error) {
    console.error('❌ Register push token error:', error);
    res.status(500).json({ 
      message: 'Failed to register push token', 
      error: error.message 
    });
  }
};

/**
 * Remove user's push token (on logout or token invalidation)
 */
export const removePushToken = async (req, res) => {
  try {
    const userId = req.user.userId;

    console.log(`🗑️ Removing push token for user ${userId}`);

    await db('users')
      .where({ id: userId })
      .update({ 
        push_token: null,
        updated_at: db.fn.now()
      });

    console.log(` Push token removed for user ${userId}`);

    res.json({ message: 'Push token removed successfully' });
  } catch (error) {
    console.error('❌ Remove push token error:', error);
    res.status(500).json({ 
      message: 'Failed to remove push token', 
      error: error.message 
    });
  }
};

/**
 * Get user's current push token
 */
export const getPushToken = async (req, res) => {
  try {
    const userId = req.user.userId;

    const user = await db('users')
      .where({ id: userId })
      .select('push_token')
      .first();

    res.json({ 
      push_token: user?.push_token || null 
    });
  } catch (error) {
    console.error('❌ Get push token error:', error);
    res.status(500).json({ 
      message: 'Failed to get push token', 
      error: error.message 
    });
  }
};

export default {
  registerPushToken,
  removePushToken,
  getPushToken,
};
