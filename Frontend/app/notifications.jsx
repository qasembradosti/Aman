import React, { useState, useEffect } from "react";
import {
  View,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Text as RNText,
  RefreshControl,
  ActivityIndicator,
  Modal,
  Pressable,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { useDispatch, useSelector } from "react-redux";
import { useLanguage } from "../utils/LanguageContext";
import { useTheme } from "../utils/ThemeContext";
import { ArrowLeft, Bell, Package, CreditCard, Tag, AlertCircle, X, Clock, CheckCircle } from "lucide-react-native";
import {
  fetchNotifications,
  fetchUnreadCount,
  markAsRead,
  markAllAsRead,
  deleteNotification,
} from "../store/slices/notificationsSlice";
import { useNotificationSocket } from "../utils/NotificationSocketProvider";

// Custom Text component with font
const Text = ({ style, ...props }) => {
  const { fontFamily } = useLanguage();
  return (
    <RNText
      style={[
        fontFamily?.regular ? { fontFamily: fontFamily.regular } : {},
        style,
      ]}
      {...props}
    />
  );
};

export default function Notifications() {
  const router = useRouter();
  const { t, isRTL } = useLanguage();
  const { theme } = useTheme();
  const dispatch = useDispatch();
  const [activeTab, setActiveTab] = useState("all");
  const [refreshing, setRefreshing] = useState(false);
  const [selectedNotificationId, setSelectedNotificationId] = useState(null);

  const { items: notifications, loading } = useSelector((state) => state.notifications);
  const { isConnected } = useNotificationSocket();

  // Get the selected notification from Redux state (always up-to-date)
  const selectedNotification = selectedNotificationId 
    ? notifications.find(n => n.id === selectedNotificationId) 
    : null;

  useEffect(() => {
    dispatch(fetchNotifications({ limit: 50 }));
    dispatch(fetchUnreadCount());
  }, [dispatch]);

  const onRefresh = async () => {
    setRefreshing(true);
    await dispatch(fetchNotifications({ limit: 50 }));
    await dispatch(fetchUnreadCount());
    setRefreshing(false);
  };

  const handleMarkAsRead = async (id) => {
    console.log('📖 Marking notification as read:', id);
    try {
      const result = await dispatch(markAsRead(id)).unwrap();
      console.log('✅ Mark as read result:', result);
    } catch (error) {
      console.error('❌ Mark as read failed:', error);
    }
  };

  const handleMarkAllAsRead = () => {
    dispatch(markAllAsRead());
  };

  const handleDelete = (id) => {
    dispatch(deleteNotification(id));
  };

  const formatTime = (dateString) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    const now = new Date();
    const diff = now - date;
    
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);
    
    if (minutes < 1) return 'just now';
    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    if (days < 7) return `${days}d ago`;
    
    return date.toLocaleDateString();
  };

  const tabs = [
    { id: "all", label: t("all") || "All" },
    { id: "unread", label: t("unread") || "Unread" },
    { id: "orders", label: t("orders") || "Orders" },
  ];

  const getIconColor = (type) => {
    switch (type) {
      case "order":
        return theme.colors.primary;
      case "payment":
        return "#10B981";
      case "promotion":
        return "#F59E0B";
      case "alert":
        return "#EF4444";
      default:
        return theme.colors.primary;
    }
  };

  const getIconComponent = (type) => {
    switch (type) {
      case "order":
        return Package;
      case "payment":
        return CreditCard;
      case "promotion":
        return Tag;
      case "alert":
        return AlertCircle;
      default:
        return Bell;
    }
  };

  const filteredNotifications = notifications.filter((notif) => {
    if (activeTab === "unread") return !notif.is_read;
    if (activeTab === "orders") return notif.type === "order";
    return true;
  });

  return (
    <SafeAreaView
      style={[
        styles.container,
        {
          backgroundColor: theme.colors.background,
          direction: isRTL ? "rtl" : "ltr",
        },
      ]}
    >
      {/* Header */}
      <View style={[styles.header, { backgroundColor: theme.colors.card }]}>
        <TouchableOpacity
          onPress={() => router.canGoBack?.() ? router.back() : router.replace('/(tabs)/home')}
          style={styles.backButton}
        >
          <ArrowLeft
            size={24}
            color={theme.colors.text}
            style={{ transform: [{ scaleX: isRTL ? -1 : 1 }] }}
          />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: theme.colors.text }]}>
          {t("notifications") || "Notifications"}
        </Text>
        <View style={{ width: 40 }} />
      </View>

      {/* Tabs */}
      <View style={[styles.tabsContainer, { backgroundColor: theme.colors.card }]}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.tabsContent}
        >
          {tabs.map((tab) => (
            <TouchableOpacity
              key={tab.id}
              style={[
                styles.tab,
                activeTab === tab.id && {
                  backgroundColor: theme.colors.primary,
                },
              ]}
              onPress={() => setActiveTab(tab.id)}
            >
              <Text
                style={[
                  styles.tabText,
                  {
                    color:
                      activeTab === tab.id ? "#fff" : theme.colors.textSecondary,
                  },
                ]}
              >
                {tab.label}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {/* Notifications List */}
      <ScrollView 
        style={styles.scrollView}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {loading && !notifications.length ? (
          <View style={styles.emptyState}>
            <ActivityIndicator size="large" color={theme.colors.primary} />
          </View>
        ) : filteredNotifications.length === 0 ? (
          <View style={styles.emptyState}>
            <Bell size={64} color={theme.colors.border} />
            <Text
              style={[
                styles.emptyTitle,
                { color: theme.colors.text, marginTop: 16 },
              ]}
            >
              {t("noNotifications") || "No Notifications"}
            </Text>
            <Text
              style={[
                styles.emptyMessage,
                { color: theme.colors.textSecondary, marginTop: 8 },
              ]}
            >
              {t("noNotificationsMessage") || "You're all caught up!"}
            </Text>
          </View>
        ) : (
          <View style={styles.notificationsList}>
            {filteredNotifications.map((notification) => {
              const IconComponent = getIconComponent(notification.type);
              return (
                <TouchableOpacity
                  key={notification.id}
                  style={[
                    styles.notificationItem,
                    {
                      backgroundColor: notification.is_read
                        ? theme.colors.card
                        : theme.colors.primary + "10",
                      borderColor: theme.colors.border,
                    },
                  ]}
                  activeOpacity={0.7}
                  onPress={() => {
                    if (!notification.is_read) {
                      handleMarkAsRead(notification.id);
                    }
                    setSelectedNotificationId(notification.id);
                  }}
                >
                  <View
                    style={[
                      styles.iconContainer,
                      { backgroundColor: getIconColor(notification.type) + "20" },
                    ]}
                  >
                    <IconComponent
                      size={20}
                      color={getIconColor(notification.type)}
                    />
                  </View>
                  <View style={styles.notificationContent}>
                    <View style={styles.notificationHeader}>
                      <Text
                        style={[
                          styles.notificationTitle,
                          { color: theme.colors.text },
                        ]}
                      >
                        {notification.title}
                      </Text>
                      {!notification.is_read && (
                        <View
                          style={[
                            styles.unreadDot,
                            { backgroundColor: theme.colors.primary },
                          ]}
                        />
                      )}
                    </View>
                    <Text
                      style={[
                        styles.notificationMessage,
                        { color: theme.colors.textSecondary },
                      ]}
                    >
                      {notification.message}
                    </Text>
                    <Text
                      style={[
                        styles.notificationTime,
                        { color: theme.colors.textSecondary },
                      ]}
                    >
                      {formatTime(notification.created_at)}
                    </Text>
                  </View>
                </TouchableOpacity>
              );
            })}
          </View>
        )}
      </ScrollView>

      {/* Notification Details Modal */}
      <Modal
        visible={!!selectedNotification}
        transparent
        animationType="fade"
        onRequestClose={() => setSelectedNotificationId(null)}
      >
        <Pressable
          style={styles.modalOverlay}
          onPress={() => setSelectedNotificationId(null)}
        >
          <Pressable
            style={[
              styles.modalContent,
              { backgroundColor: theme.colors.card },
            ]}
            onPress={(e) => e.stopPropagation()}
          >
            {selectedNotification && (
              <>
                {/* Modal Header */}
                <View style={styles.modalHeader}>
                  <View
                    style={[
                      styles.modalIconContainer,
                      {
                        backgroundColor:
                          getIconColor(selectedNotification.type) + "20",
                      },
                    ]}
                  >
                    {React.createElement(
                      getIconComponent(selectedNotification.type),
                      {
                        size: 28,
                        color: getIconColor(selectedNotification.type),
                      }
                    )}
                  </View>
                  <TouchableOpacity
                    style={[
                      styles.closeButton,
                      { backgroundColor: theme.colors.background },
                    ]}
                    onPress={() => setSelectedNotificationId(null)}
                  >
                    <X size={20} color={theme.colors.textSecondary} />
                  </TouchableOpacity>
                </View>

                {/* Title */}
                <Text
                  style={[
                    styles.modalTitle,
                    { color: theme.colors.text },
                  ]}
                >
                  {selectedNotification.title}
                </Text>

                {/* Status Badge */}
                <View
                  style={[
                    styles.statusBadge,
                    {
                      backgroundColor: selectedNotification.is_read
                        ? theme.colors.background
                        : theme.colors.primary + "20",
                    },
                  ]}
                >
                  {selectedNotification.is_read ? (
                    <CheckCircle size={14} color={theme.colors.textSecondary} />
                  ) : (
                    <Bell size={14} color={theme.colors.primary} />
                  )}
                  <Text
                    style={[
                      styles.statusText,
                      {
                        color: selectedNotification.is_read
                          ? theme.colors.textSecondary
                          : theme.colors.primary,
                      },
                    ]}
                  >
                    {selectedNotification.is_read
                      ? t("read") || "Read"
                      : t("unread") || "Unread"}
                  </Text>
                </View>

                {/* Message */}
                <Text
                  style={[
                    styles.modalMessage,
                    { color: theme.colors.text },
                  ]}
                >
                  {selectedNotification.message}
                </Text>

                {/* Time */}
                <View style={styles.timeContainer}>
                  <Clock size={14} color={theme.colors.textSecondary} />
                  <Text
                    style={[
                      styles.modalTime,
                      { color: theme.colors.textSecondary },
                    ]}
                  >
                    {formatTime(selectedNotification.created_at)}
                  </Text>
                </View>

                {/* Actions */}
                <View style={styles.modalActions}>
                  {!selectedNotification.is_read && (
                    <TouchableOpacity
                      style={[
                        styles.actionButton,
                        { backgroundColor: theme.colors.primary },
                      ]}
                      onPress={() => {
                        handleMarkAsRead(selectedNotification.id);
                      }}
                    >
                      <CheckCircle size={18} color="#fff" />
                      <Text style={styles.actionButtonText}>
                        {t("markAsRead") || "Mark as Read"}
                      </Text>
                    </TouchableOpacity>
                  )}
                </View>
              </>
            )}
          </Pressable>
        </Pressable>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "rgba(0,0,0,0.1)",
  },
  backButton: {
    width: 40,
    height: 40,
    justifyContent: "center",
  },
  headerTitle: {
    fontSize: 18,
    
  },
  tabsContainer: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "rgba(0,0,0,0.1)",
  },
  tabsContent: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    gap: 8,
  },
  tab: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: "transparent",
  },
  tabText: {
    fontSize: 14,
    
  },
  scrollView: {
    flex: 1,
  },
  emptyState: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingTop: 100,
  },
  emptyTitle: {
    fontSize: 18,
    
  },
  emptyMessage: {
    fontSize: 14,
  },
  notificationsList: {
    padding: 16,
    gap: 12,
  },
  notificationItem: {
    flexDirection: "row",
    padding: 16,
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
    gap: 12,
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 10,
    justifyContent: "center",
    alignItems: "center",
  },
  notificationContent: {
    flex: 1,
  },
  notificationHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 4,
  },
  notificationTitle: {
    fontSize: 15,
    
    flex: 1,
  },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginLeft: 8,
  },
  notificationMessage: {
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 4,
  },
  notificationTime: {
    fontSize: 12,
  },
  // Modal styles
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  modalContent: {
    width: "100%",
    maxWidth: 400,
    borderRadius: 20,
    padding: 24,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.25,
    shadowRadius: 20,
    elevation: 10,
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 16,
  },
  modalIconContainer: {
    width: 56,
    height: 56,
    borderRadius: 16,
    justifyContent: "center",
    alignItems: "center",
  },
  closeButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: "center",
    alignItems: "center",
  },
  modalTitle: {
    fontSize: 20,
    
    marginBottom: 12,
  },
  statusBadge: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-start",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    gap: 6,
    marginBottom: 16,
  },
  statusText: {
    fontSize: 13,
    
  },
  modalMessage: {
    fontSize: 16,
    lineHeight: 24,
    marginBottom: 16,
  },
  timeContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 24,
  },
  modalTime: {
    fontSize: 13,
  },
  modalActions: {
    flexDirection: "row",
    gap: 12,
  },
  actionButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 12,
    borderRadius: 12,
    gap: 8,
  },
  actionButtonText: {
    fontSize: 14,
    
    color: "#fff",
  },
  deleteButton: {
    backgroundColor: "transparent",
    borderWidth: 1.5,
  },
});
