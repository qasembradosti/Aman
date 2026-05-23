import jwt from 'jsonwebtoken';
import User from '../models/user.js';

const buildAuthenticatedUser = (user) => ({
  userId: user.id,
  id: user.id,
  username: user.username,
  email: user.email,
  role: user.role || 'seller',
  store_id: user.store_id ?? null,
});

const getBearerToken = (req) => {
  const authHeader = req.headers.authorization;
  return authHeader && authHeader.split(' ')[1];
};

const resolveAuthenticatedUser = async (token) => {
  const decoded = jwt.verify(token, process.env.JWT_SECRET);
  const user = await User.findById(decoded.userId);

  if (!user) {
    const error = new Error('User not found');
    error.statusCode = 401;
    throw error;
  }

  return buildAuthenticatedUser(user);
};

const respondToAuthError = (res, error) => {
  console.error('Auth middleware error:', error);

  const statusCode =
    error.statusCode ||
    (error.name === 'JsonWebTokenError' || error.name === 'TokenExpiredError'
      ? 403
      : 500);

  return res.status(statusCode).json({
    message:
      statusCode === 403
        ? 'Invalid or expired token'
        : statusCode === 401
          ? 'User not found'
          : 'Server error',
    error: error.message,
  });
};

/**
 * Middleware to authenticate JWT token
 */
export const authenticateToken = async (req, res, next) => {
  const token = getBearerToken(req);

  if (!token) {
    return res.status(401).json({ message: 'Access token is required' });
  }

  try {
    req.user = await resolveAuthenticatedUser(token);
    next();
  } catch (error) {
    return respondToAuthError(res, error);
  }
};

/**
 * Middleware to attach a JWT user when a token is present, without requiring it.
 */
export const authenticateTokenIfPresent = async (req, _res, next) => {
  const token = getBearerToken(req);

  if (!token) {
    next();
    return;
  }

  try {
    req.user = await resolveAuthenticatedUser(token);
  } catch (error) {
    console.warn('Optional auth ignored:', error.message);
  }

  next();
};
