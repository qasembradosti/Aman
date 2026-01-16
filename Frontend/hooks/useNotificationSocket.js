import { useEffect, useRef } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import io from 'socket.io-client';
import { fetchNotifications, fetchUnreadCount } from '../store/slices/notificationsSlice';
import { getApiBaseUrl } from '../utils/apiConfig';

export const useNotificationSocket = () => {
  const socketRef = useRef(null);
  const mountedRef = useRef(false);
  const { isAuthenticated } = useSelector((state) => state.auth);
  const token = useSelector((state) => state.auth.token);
  const dispatch = useDispatch();

  useEffect(() => {
    // Prevent multiple simultaneous connections
    if (mountedRef.current) {
      return;
    }

    // Don't connect if not authenticated or no token
    if (!isAuthenticated || !token) {
      return;
    }

    // Don't reconnect if already connected
    if (socketRef.current?.connected) {
      return;
    }

    mountedRef.current = true;

    const API_URL = getApiBaseUrl();
    console.log('🔌 Socket: Connecting to:', API_URL);
    console.log('🔑 Socket: Using token:', token ? 'Token present' : 'No token');
    
    const socket = io(API_URL, {
      auth: { token },
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      reconnectionAttempts: 5,
      transports: ['websocket', 'polling'],
      timeout: 10000,
      forceNew: false
    });

    // Connection events
    socket.on('connect', () => {
      console.log('✅ Socket connected!');
    });

    socket.on('connected', (data) => {
      console.log('✅ Connected to notification service:', data);
    });

    // New notification event
    socket.on('new_notification', (notification) => {
      console.log('📢 New notification received:', notification);
      dispatch(fetchNotifications({ limit: 50 }));
      dispatch(fetchUnreadCount());
    });

    // Notification read event
    socket.on('notification_read', (data) => {
      console.log('📖 Notification marked as read:', data);
      dispatch(fetchNotifications({ limit: 50 }));
      dispatch(fetchUnreadCount());
    });

    // All notifications read event
    socket.on('all_notifications_read', () => {
      console.log('📖 All notifications marked as read');
      dispatch(fetchNotifications({ limit: 50 }));
      dispatch(fetchUnreadCount());
    });

    // Notification deleted event
    socket.on('notification_deleted', (data) => {
      console.log('🗑️ Notification deleted:', data);
      dispatch(fetchNotifications({ limit: 50 }));
    });

    // Broadcast notification event
    socket.on('broadcast_notification', (notification) => {
      console.log('📡 Broadcast notification received:', notification);
      dispatch(fetchNotifications({ limit: 50 }));
      dispatch(fetchUnreadCount());
    });

    // Reconnect attempt event
    socket.on('reconnect_attempt', (attemptNumber) => {
      console.log(`🔄 Reconnection attempt #${attemptNumber}`);
    });

    // Reconnect event
    socket.on('reconnect', (attemptNumber) => {
      console.log(`🔄 Reconnected to notification service after ${attemptNumber} attempts`);
      dispatch(fetchNotifications({ limit: 50 }));
      dispatch(fetchUnreadCount());
    });

    // Reconnect failed event
    socket.on('reconnect_failed', () => {
      console.error('❌ All reconnection attempts failed');
    });

    // Connect error
    socket.on('connect_error', (error) => {
      console.error('❌ Socket connection error:', error.message);
      console.error('❌ Error details:', {
        type: error.type,
        description: error.description,
        context: error.context
      });
      console.error('❌ Full error:', error);
    });

    // Disconnect event
    socket.on('disconnect', (reason) => {
      console.log('❌ Disconnected from notification service:', reason);
    });

    // Error event
    socket.on('error', (error) => {
      console.error('⚠️ Socket error:', error);
    });

    socketRef.current = socket;

    // Cleanup on unmount
    return () => {
      mountedRef.current = false;
      if (socketRef.current) {
        console.log('🔌 Disconnecting socket...');
        socketRef.current.disconnect();
        socketRef.current = null;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAuthenticated, token]);

  return {
    socket: socketRef.current,
    isConnected: socketRef.current?.connected || false
  };
};

export default useNotificationSocket;
