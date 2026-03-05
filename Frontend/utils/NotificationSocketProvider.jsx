import React, { createContext, useContext, useEffect, useRef, useState, useCallback } from 'react';
import { View, StyleSheet, TouchableOpacity, Animated, Dimensions } from 'react-native';
import { useDispatch, useSelector } from 'react-redux';
import io from 'socket.io-client';
import Constants from 'expo-constants';
import { useRouter } from 'expo-router';
import { Bell } from 'lucide-react-native';
import { fetchNotifications, fetchUnreadCount, markAsRead } from '../store/slices/notificationsSlice';
import { getApiBaseUrl } from './apiConfig';
import { useTheme } from './ThemeContext';
import { Text } from '../components/ui/Text';
import { registerPushToken as savePushTokenToBackend } from '../services/pushTokenService';

// Check if running in Expo Go - if so, skip expo-notifications entirely
const isExpoGo = Constants.appOwnership === 'expo';

const NotificationSocketContext = createContext({
  socket: null,
  isConnected: false,
  expoPushToken: null,
});

export function useNotificationSocket() {
  return useContext(NotificationSocketContext);
}

// Show a native push notification
async function showLocalNotification(notification) {
  const title = notification?.title || 'New Notification';
  const body = notification?.message || notification?.body || 'You have a new notification';

  // Skip in Expo Go - push notifications only work in development/production builds
  if (isExpoGo) {
    console.log('📱 Notification (Expo Go - no push):', title, '-', body);
    return;
  }

  // In development/production builds, show native push notification
  try {
    const Notifications = require('expo-notifications');
    const Platform = require('react-native').Platform;
    
    const notificationContent = {
      title,
      body,
      sound: 'default',
      data: notification,
    };

    // Add Android-specific config
    if (Platform.OS === 'android') {
      notificationContent.priority = Notifications.AndroidNotificationPriority.MAX;
      notificationContent.channelId = 'important';
      notificationContent.vibrate = [0, 500, 500, 500];
    }

    await Notifications.scheduleNotificationAsync({
      content: notificationContent,
      trigger: null, // Show immediately
    });
  } catch (error) {
    console.log('❌ Failed to show notification:', error.message);
  }
}

export function NotificationSocketProvider({ children }) {
  const socketRef = useRef(null);
  const [expoPushToken, setExpoPushToken] = useState(null);
  const [inAppNotification, setInAppNotification] = useState(null);
  
  const { isAuthenticated } = useSelector((state) => state.auth);
  const token = useSelector((state) => state.auth.token);
  const dispatch = useDispatch();

  // Callback to show in-app notification (for Expo Go)
  const showInAppNotification = useCallback((notification) => {
    console.log('🔔 Showing in-app notification:', notification);
    setInAppNotification(notification);
  }, []);

  // Setup push notifications only in development builds (not Expo Go)
  useEffect(() => {
    if (!isAuthenticated || isExpoGo) return;

    let notificationListener = null;
    let responseListener = null;

    const setupNotifications = async () => {
      try {
        const Notifications = require('expo-notifications');
        const Device = require('expo-device');

        // Configure notification handler
        Notifications.setNotificationHandler({
          handleNotification: async (notification) => ({
            shouldShowAlert: true,
            shouldPlaySound: true,
            shouldSetBadge: true,
            priority: Notifications.AndroidNotificationPriority.MAX,
          }),
        });

        // Setup Android channel with high priority
        if (require('react-native').Platform.OS === 'android') {
          await Notifications.setNotificationChannelAsync('default', {
            name: 'Default Notifications',
            importance: Notifications.AndroidImportance.MAX,
            vibrationPattern: [0, 250, 250, 250],
            lightColor: '#4F46E5',
            sound: 'default',
            enableVibrate: true,
            showBadge: true,
            lockscreenVisibility: Notifications.AndroidNotificationVisibility.PUBLIC,
          });

          // Create high priority channel
          await Notifications.setNotificationChannelAsync('important', {
            name: 'Important Notifications',
            importance: Notifications.AndroidImportance.MAX,
            vibrationPattern: [0, 500, 500, 500],
            lightColor: '#FF0000',
            sound: 'default',
            enableVibrate: true,
            showBadge: true,
            lockscreenVisibility: Notifications.AndroidNotificationVisibility.PUBLIC,
          });
        }

        // Request permissions
        if (Device.isDevice) {
          const { status: existingStatus } = await Notifications.getPermissionsAsync();
          let finalStatus = existingStatus;

          if (existingStatus !== 'granted') {
            const { status } = await Notifications.requestPermissionsAsync();
            finalStatus = status;
          }

          if (finalStatus === 'granted') {
            const tokenData = await Notifications.getExpoPushTokenAsync({
              projectId: Constants.expoConfig?.extra?.eas?.projectId,
            });
            const pushToken = tokenData.data;
            setExpoPushToken(pushToken);
            
            // Register push token with backend
            try {
              await savePushTokenToBackend(pushToken);
            } catch (err) {
              console.error('⚠️ Failed to save push token to backend:', err);
              // Don't fail the whole setup if backend registration fails
            }
          }
        }

        // Setup listeners
        notificationListener = Notifications.addNotificationReceivedListener((notification) => {
          console.log('📬 Notification received:', notification);
        });

        responseListener = Notifications.addNotificationResponseReceivedListener((response) => {
          console.log('👆 Notification tapped:', response);
        });
      } catch (error) {
        // Silently skip push notification setup in Expo Go or without build
        // Push notifications only work in standalone builds (not Expo Go)
        if (!isExpoGo && error.message?.includes('Firebase')) {
          console.log('ℹ️ Push notifications will be available after building the app');
          console.log('   Run: eas build -p android --profile preview');
        }
      }
    };

    setupNotifications();

    return () => {
      if (notificationListener) {
        try {
          const Notifications = require('expo-notifications');
          Notifications.removeNotificationSubscription(notificationListener);
        } catch (e) {}
      }
      if (responseListener) {
        try {
          const Notifications = require('expo-notifications');
          Notifications.removeNotificationSubscription(responseListener);
        } catch (e) {}
      }
    };
  }, [isAuthenticated]);

  // Socket connection
  useEffect(() => {
    if (!isAuthenticated || !token) {
      if (socketRef.current) {
        console.log('🔌 Auth lost, disconnecting socket...');
        socketRef.current.disconnect();
        socketRef.current = null;
      }
      return;
    }

    if (socketRef.current?.connected) {
      return;
    }

    const API_URL = getApiBaseUrl();
    console.log('🔌 Global Socket: Connecting to:', API_URL);
    
    const socket = io(API_URL, {
      auth: { token },
      reconnection: true,
      reconnectionDelay: 2000,
      reconnectionDelayMax: 10000,
      reconnectionAttempts: Infinity,
      transports: ['websocket', 'polling'],
      timeout: false,
      forceNew: false,
      autoConnect: true,
      upgrade: true,
      rememberUpgrade: true,
    });

    socket.on('connect', () => {
      console.log(' Global Socket connected!');
    });

    socket.on('connected', (data) => {
      console.log('Connected to notification service:', data);
    });

    // New notification event
    socket.on('new_notification', async (notification) => {
      console.log('📢 New notification received:', notification);
      dispatch(fetchNotifications({ limit: 50 }));
      dispatch(fetchUnreadCount());
      
      // Show native push notification (works in background/foreground)
      await showLocalNotification(notification);
      
      // Show in-app notification dialog (only in Expo Go or when app is in foreground)
      showInAppNotification(notification);
    });

    socket.on('notification_read', (data) => {
      console.log('📖 Notification marked as read:', data);
      dispatch(fetchNotifications({ limit: 50 }));
      dispatch(fetchUnreadCount());
    });

    socket.on('all_notifications_read', () => {
      console.log('📖 All notifications marked as read');
      dispatch(fetchNotifications({ limit: 50 }));
      dispatch(fetchUnreadCount());
    });

    socket.on('notification_deleted', (data) => {
      console.log('🗑️ Notification deleted:', data);
      dispatch(fetchNotifications({ limit: 50 }));
    });

    socket.on('broadcast_notification', async (notification) => {
      console.log('📡 Broadcast notification received:', notification);
      dispatch(fetchNotifications({ limit: 50 }));
      dispatch(fetchUnreadCount());
      await showLocalNotification(notification);
    });

    socket.on('reconnect_attempt', (attemptNumber) => {
      console.log(`🔄 Reconnection attempt #${attemptNumber}`);
    });

    socket.on('reconnect', (attemptNumber) => {
      console.log(`🔄 Reconnected after ${attemptNumber} attempts`);
      dispatch(fetchNotifications({ limit: 50 }));
      dispatch(fetchUnreadCount());
    });

    socket.on('reconnect_failed', () => {
      console.warn('⚠️ Reconnection attempts taking longer than expected, but will continue trying...');
    });

    socket.on('connect_error', (error) => {
      const errorMsg = error.message || 'Unknown error';
      if (!errorMsg.includes('timeout')) {
        console.error('❌ Socket connection error:', errorMsg);
      } else {
        console.warn('⏱️ Socket timeout, will retry...', errorMsg);
      }
    });

    socket.on('disconnect', (reason) => {
      console.log('❌ Disconnected from notification service:', reason);
    });

    socket.on('error', (error) => {
      const errorMsg = error?.message || error || 'Unknown error';
      if (!errorMsg.toString().toLowerCase().includes('timeout')) {
        console.error('⚠️ Socket error:', errorMsg);
      }
    });

    socketRef.current = socket;

    return () => {
      if (socketRef.current) {
        socketRef.current.disconnect();
        socketRef.current = null;
      }
    };
  }, [isAuthenticated, token, dispatch, showInAppNotification]);

  const value = {
    socket: socketRef.current,
    isConnected: socketRef.current?.connected || false,
    expoPushToken,
  };

  return (
    <NotificationSocketContext.Provider value={value}>
      <View style={styles.providerContainer}>
        {children}
        {/* In-app notification toast - shows for new WebSocket notifications */}
        {inAppNotification && (
          <View style={styles.toastOverlay} pointerEvents="box-none">
            <InAppNotificationToast
              notification={inAppNotification}
              onDismiss={() => setInAppNotification(null)}
            />
          </View>
        )}
      </View>
    </NotificationSocketContext.Provider>
  );
}

const styles = StyleSheet.create({
  providerContainer: {
    flex: 1,
  },
  toastOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 99999,
    elevation: 99999,
  },
});

// Beautiful in-app notification toast component
function InAppNotificationToast({ notification, onDismiss }) {
  const { theme } = useTheme();
  const router = useRouter();
  const dispatch = useDispatch();
  const slideAnim = useRef(new Animated.Value(-150)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;
  const { width } = Dimensions.get('window');

  useEffect(() => {
    // Slide in
    Animated.parallel([
      Animated.spring(slideAnim, {
        toValue: 0,
        useNativeDriver: true,
        tension: 50,
        friction: 8,
      }),
      Animated.timing(opacityAnim, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }),
    ]).start();

    // Auto dismiss after 4 seconds
    const timeout = setTimeout(() => {
      dismissNotification();
    }, 4000);

    return () => clearTimeout(timeout);
  }, []);

  const dismissNotification = () => {
    Animated.parallel([
      Animated.timing(slideAnim, {
        toValue: -150,
        duration: 250,
        useNativeDriver: true,
      }),
      Animated.timing(opacityAnim, {
        toValue: 0,
        duration: 250,
        useNativeDriver: true,
      }),
    ]).start(() => onDismiss());
  };

  const handleNotificationPress = () => {
    console.log('👆 Notification toast pressed!', notification);
    // Mark as read if notification has an ID and is unread
    if (notification?.id && notification?.is_read === false) {
      console.log('📖 Marking notification as read:', notification.id);
      dispatch(markAsRead(notification.id));
    }
    // Navigate to notifications page
    dismissNotification();
    router.push('/notifications');
  };

  const title = notification?.title || 'New Notification';
  const body = notification?.message || notification?.body || '';

  return (
    <Animated.View
      style={[
        toastStyles.container,
        {
          width: width - 32,
          backgroundColor: theme.colors.card,
          borderLeftColor: theme.colors.primary,
          shadowColor: theme.colors.primary,
          transform: [{ translateY: slideAnim }],
          opacity: opacityAnim,
        },
      ]}
    >
      <TouchableOpacity
        style={toastStyles.content}
        onPress={handleNotificationPress}
        activeOpacity={0.9}
      >
        <View style={[toastStyles.iconContainer, { backgroundColor: theme.colors.primary + '20' }]}>
          <Bell size={24} color={theme.colors.primary} />
        </View>
        <View style={toastStyles.textContainer}>
          <Text style={[toastStyles.title, { color: theme.colors.text }]} numberOfLines={1}>
            {title}
          </Text>
          {body ? (
            <Text style={[toastStyles.body, { color: theme.colors.textSecondary }]} numberOfLines={2}>
              {body}
            </Text>
          ) : null}
        </View>
        <View style={[toastStyles.indicator, { backgroundColor: theme.colors.primary }]} />
      </TouchableOpacity>
    </Animated.View>
  );
}

const toastStyles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 50,
    left: 16,
    right: 16,
    borderRadius: 16,
    borderLeftWidth: 4,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 16,
    elevation: 8,
    zIndex: 9999,
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  textContainer: {
    flex: 1,
  },
  title: {
    fontSize: 16,
    marginBottom: 2,
  },
  body: {
    fontSize: 14,
    lineHeight: 20,
  },
  indicator: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginLeft: 8,
  },
});

export default NotificationSocketProvider;
