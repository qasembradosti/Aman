import { Server as SocketIOServer } from 'socket.io';
import jwt from 'jsonwebtoken';
import Notification from '../models/notification.js';

// Store active user connections
const userConnections = new Map();

export function setupSocketIO(httpServer) {
  const io = new SocketIOServer(httpServer, {
    cors: {
      origin: '*', // Allow all origins in development
      methods: ['GET', 'POST'],
      credentials: true,
      allowedHeaders: ['*']
    },
    transports: ['websocket', 'polling'],
    pingTimeout: 60000,
    pingInterval: 25000
  });

  console.log('🔌 Socket.io server initialized');

  // Middleware for socket authentication
  io.use((socket, next) => {
    const token = socket.handshake.auth.token;
    
    console.log('🔐 Socket auth attempt from:', socket.handshake.address);
    console.log('🔐 Token provided:', token ? 'Yes' : 'No');
    
    if (!token) {
      console.log('❌ No token provided in socket handshake');
      return next(new Error('Authentication error: No token provided'));
    }

    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key');
      socket.userId = decoded.userId;
      socket.username = decoded.username;
      console.log('✅ Socket authenticated:', decoded.username, '(userId:', decoded.userId, ')');
      next();
    } catch (error) {
      console.log('❌ Invalid token:', error.message);
      next(new Error('Invalid token: ' + error.message));
    }
  });

  // Connection handler
  io.on('connection', (socket) => {
    console.log(`✅ User ${socket.userId} connected with socket ${socket.id}`);

    // Track user connection
    if (!userConnections.has(socket.userId)) {
      userConnections.set(socket.userId, []);
    }
    userConnections.get(socket.userId).push(socket.id);

    // Join user-specific room
    socket.join(`user:${socket.userId}`);

    // Send connection confirmation
    socket.emit('connected', {
      message: 'Connected to notification service',
      userId: socket.userId,
      timestamp: new Date()
    });

    // Listen for getting notifications
    socket.on('get_notifications', async (data, callback) => {
      try {
        const { limit = 20, offset = 0, unreadOnly = false } = data || {};
        const notifications = await Notification.getUserNotifications(socket.userId, {
          limit,
          offset,
          unreadOnly
        });

        callback({ success: true, notifications });
      } catch (error) {
        console.error('Get notifications error:', error);
        callback({ success: false, error: error.message });
      }
    });

    // Listen for mark as read
    socket.on('mark_as_read', async (notificationId, callback) => {
      try {
        const notification = await Notification.markAsRead(notificationId, socket.userId);
        if (!notification) {
          return callback({ success: false, error: 'Notification not found' });
        }

        // Broadcast to user's other connections
        socket.to(`user:${socket.userId}`).emit('notification_read', {
          id: notificationId,
          is_read: true
        });

        callback({ success: true, notification });
      } catch (error) {
        console.error('Mark as read error:', error);
        callback({ success: false, error: error.message });
      }
    });

    // Listen for mark all as read
    socket.on('mark_all_as_read', async (callback) => {
      try {
        await Notification.markAllAsRead(socket.userId);

        // Broadcast to user's other connections
        socket.to(`user:${socket.userId}`).emit('all_notifications_read');

        callback({ success: true });
      } catch (error) {
        console.error('Mark all as read error:', error);
        callback({ success: false, error: error.message });
      }
    });

    // Listen for delete notification
    socket.on('delete_notification', async (notificationId, callback) => {
      try {
        await Notification.delete(notificationId, socket.userId);

        // Broadcast to user's other connections
        socket.to(`user:${socket.userId}`).emit('notification_deleted', {
          id: notificationId
        });

        callback({ success: true });
      } catch (error) {
        console.error('Delete notification error:', error);
        callback({ success: false, error: error.message });
      }
    });

    // Disconnect handler
    socket.on('disconnect', () => {
      console.log(`❌ User ${socket.userId} disconnected (socket ${socket.id})`);

      // Remove user connection
      const connections = userConnections.get(socket.userId) || [];
      const index = connections.indexOf(socket.id);
      if (index > -1) {
        connections.splice(index, 1);
      }

      if (connections.length === 0) {
        userConnections.delete(socket.userId);
        console.log(`User ${socket.userId} fully disconnected`);
      }
    });

    // Error handler
    socket.on('error', (error) => {
      console.error(`⚠️ Socket error for user ${socket.userId}:`, error);
    });
  });

  // Global error handler
  io.engine.on('connection_error', (err) => {
    console.error('❌ Socket.io connection error:', err);
  });

  return io;
}

// Helper function to send notification to a user
export async function sendNotificationToUser(userId, notification) {
  const io = global.io;
  if (!io) return;

  io.to(`user:${userId}`).emit('new_notification', notification);
}

// Helper function to send notification to multiple users
export async function sendNotificationToUsers(userIds, notification) {
  const io = global.io;
  if (!io) return;

  userIds.forEach(userId => {
    io.to(`user:${userId}`).emit('new_notification', notification);
  });
}

// Helper function to broadcast notification to all connected users
export async function broadcastNotification(notification) {
  const io = global.io;
  if (!io) return;

  io.emit('broadcast_notification', notification);
}

export default setupSocketIO;
