import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from 'react';
import {
  Animated,
  AppState,
  Dimensions,
  StyleSheet,
  TouchableOpacity,
  View,
} from 'react-native';
import { useDispatch, useSelector } from 'react-redux';
import socketIoClient from 'socket.io-client';
import Constants from 'expo-constants';
import { useRootNavigationState, useRouter } from 'expo-router';
import { Bell } from 'lucide-react-native';
import * as Notifications from 'expo-notifications';
import {
  fetchNotifications,
  fetchUnreadCount,
  markAsRead,
} from '../store/slices/notificationsSlice';
import { getApiBaseUrl } from './apiConfig';
import { useTheme } from './ThemeContext';
import { Text } from '../components/ui/Text';
import { registerPushToken as savePushTokenToBackend } from '../services/pushTokenService';

// Set notification handler at module level so it applies regardless of auth state
// and is ready before any notification arrives (including background wakeup).
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

const isExpoGo = Constants.appOwnership === 'expo';
const DEFAULT_NOTIFICATION_ROUTE = '/notifications';

const NotificationSocketContext = createContext({
  socket: null,
  isConnected: false,
  expoPushToken: null,
});

const getNotificationContent = (source) =>
  source?.notification?.request?.content || source?.request?.content || source?.content || source;

const getNotificationData = (source) => {
  const content = getNotificationContent(source);
  return content?.data || source?.data || {};
};

const normalizeNotificationPayload = (source) => {
  if (!source) {
    return null;
  }

  const content = getNotificationContent(source);
  const data = getNotificationData(source);
  const title = content?.title || source?.title || 'New Notification';
  const body =
    content?.body ||
    source?.message ||
    source?.body ||
    'You have a new notification';
  const notificationId = source?.id || data?.notificationId || data?.notification_id || null;
  const requestId =
    source?.request?.identifier ||
    source?.notification?.request?.identifier ||
    null;
  const route = data?.route || data?.path || null;

  return {
    ...source,
    id: notificationId,
    title,
    message: body,
    body,
    data,
    route,
    key:
      notificationId ||
      requestId ||
      `${title}:${body}:${route || data?.productId || data?.product_id || data?.orderId || data?.order_id || ''}`,
  };
};

const resolveNotificationRoute = (notification) => {
  const payload = normalizeNotificationPayload(notification);
  const data = payload?.data || {};
  const route = payload?.route || data?.route || data?.path;

  if (route) {
    return route;
  }

  const orderId = data?.orderId || data?.order_id;
  if (orderId) {
    return `/order/${orderId}`;
  }

  const productId = data?.productId || data?.product_id;
  if (productId) {
    return `/product/${productId}`;
  }

  return DEFAULT_NOTIFICATION_ROUTE;
};

export function useNotificationSocket() {
  return useContext(NotificationSocketContext);
}

export function NotificationSocketProvider({ children }) {
  const socketRef = useRef(null);
  const appStateRef = useRef(AppState.currentState);
  const recentNotificationKeysRef = useRef(new Map());
  const handledResponseKeysRef = useRef(new Set());
  const pendingRouteRef = useRef(null);
  const [expoPushToken, setExpoPushToken] = useState(null);
  const [inAppNotification, setInAppNotification] = useState(null);

  const { isAuthenticated } = useSelector((state) => state.auth);
  const token = useSelector((state) => state.auth.token);
  const dispatch = useDispatch();
  const router = useRouter();
  const navigationState = useRootNavigationState();

  const showInAppNotification = useCallback((notification) => {
    setInAppNotification(notification);
  }, []);

  useEffect(() => {
    const subscription = AppState.addEventListener('change', (nextState) => {
      appStateRef.current = nextState;
    });

    return () => {
      subscription.remove();
    };
  }, []);

  const refreshNotifications = useCallback(() => {
    dispatch(fetchNotifications({ limit: 50 }));
    dispatch(fetchUnreadCount());
  }, [dispatch]);

  const rememberNotificationKey = useCallback((key) => {
    if (!key) {
      return false;
    }

    const now = Date.now();
    const recentKeys = recentNotificationKeysRef.current;

    for (const [existingKey, timestamp] of recentKeys.entries()) {
      if (now - timestamp > 15000) {
        recentKeys.delete(existingKey);
      }
    }

    if (recentKeys.has(key)) {
      return true;
    }

    recentKeys.set(key, now);
    return false;
  }, []);

  const navigateFromNotification = useCallback(
    (notification) => {
      const route = resolveNotificationRoute(notification);

      if (!navigationState?.key) {
        pendingRouteRef.current = route;
        return;
      }

      pendingRouteRef.current = null;
      router.push(route);
    },
    [navigationState?.key, router],
  );

  useEffect(() => {
    if (!navigationState?.key || !pendingRouteRef.current) {
      return;
    }

    const route = pendingRouteRef.current;
    pendingRouteRef.current = null;
    router.push(route);
  }, [navigationState?.key, router]);

  const handleNotificationResponse = useCallback(
    async (response, NotificationsModule = null) => {
      const payload = normalizeNotificationPayload(response);

      if (!payload?.key || handledResponseKeysRef.current.has(payload.key)) {
        return;
      }

      handledResponseKeysRef.current.add(payload.key);

      if (payload.id) {
        dispatch(markAsRead(payload.id));
      }

      refreshNotifications();
      navigateFromNotification(payload);

      if (
        NotificationsModule &&
        typeof NotificationsModule.clearLastNotificationResponseAsync === 'function'
      ) {
        try {
          await NotificationsModule.clearLastNotificationResponseAsync();
        } catch {}
      }
    },
    [dispatch, navigateFromNotification, refreshNotifications],
  );

  const handleIncomingNotification = useCallback(
    (notification) => {
      const payload = normalizeNotificationPayload(notification);

      if (!payload) {
        return;
      }

      refreshNotifications();

      const isActive = appStateRef.current === 'active';
      const isDuplicate = rememberNotificationKey(payload.key);

      if (isActive && !isDuplicate) {
        showInAppNotification(payload);
      }
    },
    [refreshNotifications, rememberNotificationKey, showInAppNotification],
  );

  useEffect(() => {
    if (!isAuthenticated || isExpoGo) {
      return undefined;
    }

    let notificationListener = null;
    let responseListener = null;

    const setupNotifications = async () => {
      try {
        const Device = require('expo-device');
        const { Platform } = require('react-native');

        if (Platform.OS === 'android') {
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

        if (Device.isDevice) {
          const { status: existingStatus } = await Notifications.getPermissionsAsync();
          let finalStatus = existingStatus;

          if (existingStatus !== 'granted') {
            const { status } = await Notifications.requestPermissionsAsync();
            finalStatus = status;
          }

          if (finalStatus === 'granted') {
            const projectId =
              Constants.expoConfig?.extra?.eas?.projectId ||
              Constants.easConfig?.projectId;
            const tokenData = projectId
              ? await Notifications.getExpoPushTokenAsync({ projectId })
              : await Notifications.getExpoPushTokenAsync();
            const pushToken = tokenData.data;

            setExpoPushToken(pushToken);

            try {
              await savePushTokenToBackend(pushToken);
            } catch (error) {
              console.error('Failed to save push token to backend:', error);
            }
          }
        }

        notificationListener = Notifications.addNotificationReceivedListener((notification) => {
          handleIncomingNotification(notification);
        });

        responseListener = Notifications.addNotificationResponseReceivedListener((response) => {
          handleNotificationResponse(response, Notifications);
        });

        const initialResponse = await Notifications.getLastNotificationResponseAsync();
        if (initialResponse) {
          await handleNotificationResponse(initialResponse, Notifications);
        }
      } catch (error) {
        if (!isExpoGo && error.message?.includes('Firebase')) {
          console.log('Push notifications will be available after building the app');
          console.log('Run: eas build -p android --profile preview');
        }
      }
    };

    setupNotifications();

    return () => {
      if (notificationListener) {
        try {
          const Notifications = require('expo-notifications');
          Notifications.removeNotificationSubscription(notificationListener);
        } catch {}
      }

      if (responseListener) {
        try {
          const Notifications = require('expo-notifications');
          Notifications.removeNotificationSubscription(responseListener);
        } catch {}
      }
    };
  }, [handleIncomingNotification, handleNotificationResponse, isAuthenticated]);

  useEffect(() => {
    if (!isAuthenticated || !token) {
      if (socketRef.current) {
        socketRef.current.disconnect();
        socketRef.current = null;
      }
      return undefined;
    }

    if (socketRef.current?.connected) {
      return undefined;
    }

    const apiUrl = getApiBaseUrl();
    const socket = socketIoClient(apiUrl, {
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
      console.log('Global notification socket connected');
    });

    socket.on('connected', (data) => {
      console.log('Connected to notification service:', data);
    });

    socket.on('new_notification', (notification) => {
      handleIncomingNotification(notification);
    });

    socket.on('notification_read', () => {
      refreshNotifications();
    });

    socket.on('all_notifications_read', () => {
      refreshNotifications();
    });

    socket.on('notification_deleted', () => {
      refreshNotifications();
    });

    socket.on('broadcast_notification', (notification) => {
      handleIncomingNotification(notification);
    });

    socket.on('reconnect', () => {
      refreshNotifications();
    });

    socket.on('connect_error', (error) => {
      const errorMessage = error?.message || 'Unknown error';
      if (!errorMessage.includes('timeout')) {
        console.error('Socket connection error:', errorMessage);
      }
    });

    socket.on('disconnect', (reason) => {
      console.log('Disconnected from notification service:', reason);
    });

    socket.on('error', (error) => {
      const errorMessage = error?.message || error || 'Unknown error';
      if (!String(errorMessage).toLowerCase().includes('timeout')) {
        console.error('Socket error:', errorMessage);
      }
    });

    socketRef.current = socket;

    return () => {
      if (socketRef.current) {
        socketRef.current.disconnect();
        socketRef.current = null;
      }
    };
  }, [dispatch, handleIncomingNotification, isAuthenticated, refreshNotifications, token]);

  const value = {
    socket: socketRef.current,
    isConnected: socketRef.current?.connected || false,
    expoPushToken,
  };

  return (
    <NotificationSocketContext.Provider value={value}>
      <View style={styles.providerContainer}>
        {children}
        {inAppNotification ? (
          <View style={styles.toastOverlay} pointerEvents="box-none">
            <InAppNotificationToast
              notification={inAppNotification}
              onDismiss={() => setInAppNotification(null)}
            />
          </View>
        ) : null}
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

function InAppNotificationToast({ notification, onDismiss }) {
  const { theme } = useTheme();
  const router = useRouter();
  const dispatch = useDispatch();
  const slideAnim = useRef(new Animated.Value(-150)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;
  const { width } = Dimensions.get('window');

  const dismissNotification = useCallback(() => {
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
  }, [onDismiss, opacityAnim, slideAnim]);

  useEffect(() => {
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

    const timeout = setTimeout(() => {
      dismissNotification();
    }, 4000);

    return () => clearTimeout(timeout);
  }, [dismissNotification, opacityAnim, slideAnim]);

  const handleNotificationPress = () => {
    if (notification?.id) {
      dispatch(markAsRead(notification.id));
    }

    dismissNotification();
    router.push(resolveNotificationRoute(notification));
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
        <View style={[toastStyles.iconContainer, { backgroundColor: `${theme.colors.primary}20` }]}>
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
