import jwt from 'jsonwebtoken';
import User from '../models/user.js';

/**
 * Middleware to authenticate JWT token
 */
export const authenticateToken = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
      return res.status(401).json({ message: 'Access token is required' });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.userId);

    if (!user) {
      return res.status(401).json({ message: 'User not found' });
    }

    req.user = {
      userId: user.id,
      id: user.id,
      username: user.username,
      email: user.email,
      role: user.role || 'seller',
      store_id: user.store_id ?? null,
    };

    next();
  } catch (error) {
    console.error('Auth middleware error:', error);

    const statusCode =
      error.name === 'JsonWebTokenError' || error.name === 'TokenExpiredError'
        ? 403
        : 500;

    return res.status(statusCode).json({
      message:
        statusCode === 403 ? 'Invalid or expired token' : 'Server error',
      error: error.message,
    });
  }
};
