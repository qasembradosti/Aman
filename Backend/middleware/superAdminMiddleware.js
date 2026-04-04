import jwt from 'jsonwebtoken';
import User from '../models/user.js';
import { isSuperAdmin } from './adminPanelMiddleware.js';

// Middleware to check if user is superadmin (for admin panel access)
export const requireSuperAdmin = async (req, res, next) => {
  try {
    let user = req.user;

    if (!user) {
      const token = req.headers.authorization?.split(' ')[1];

      if (!token) {
        return res.status(401).json({
          success: false,
          message: 'Access denied. No token provided.',
        });
      }

      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      const currentUser = await User.findById(decoded.userId);

      if (!currentUser) {
        return res.status(401).json({
          success: false,
          message: 'User not found.',
        });
      }

      user = {
        userId: currentUser.id,
        id: currentUser.id,
        username: currentUser.username,
        email: currentUser.email,
        role: currentUser.role || 'seller',
        store_id: currentUser.store_id ?? null,
      };
    }

    if (!isSuperAdmin(user)) {
      return res.status(403).json({
        success: false,
        message: 'Access denied. Superadmin role required.',
      });
    }

    req.user = user;
    next();
  } catch (error) {
    return res.status(401).json({
      success: false,
      message: 'Invalid or expired token.',
    });
  }
};

// Check if user is authenticated (any role)
export const isAuthenticated = async (req, res, next) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];

    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'Access denied. No token provided.',
      });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.userId);

    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'User not found.',
      });
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
    return res.status(401).json({
      success: false,
      message: 'Invalid or expired token.',
    });
  }
};
