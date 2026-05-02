import {
  View,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  Text as RNText,
  RefreshControl,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons, Octicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { logout } from "../../store/slices/authSlice";
import { fetchWallet } from "../../store/slices/walletSlice";
import { fetchOrders } from "../../store/slices/ordersSlice";
import { useLanguage } from "../../utils/LanguageContext";
import { useTheme } from "../../utils/ThemeContext";
import { getApiBaseUrl } from "../../utils/apiConfig";
import LanguageSelector from "../../components/LanguageSelector";
import ConfirmDialog from "../../components/ui/ConfirmDialog";
import ChatSupport from "../../components/ChatSupport";
import ChatHeaderButton from "../../components/ChatHeaderButton";
import { getUserConversations } from "../../services/chatService";
// Use theme.colors.primary instead of direct constant

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

export default function Profile() {
  const router = useRouter();
  const dispatch = useDispatch();
  const { t, locale, isRTL } = useLanguage();
  const { theme } = useTheme();
  const [showLanguageSelector, setShowLanguageSelector] = useState(false);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const [showBalance, setShowBalance] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showChat, setShowChat] = useState(false);
  const [selectedConversationId, setSelectedConversationId] = useState(null);
  const [conversations, setConversations] = useState([]);
  const API_BASE_URL = getApiBaseUrl();

  // Get auth state from Redux
  const { isAuthenticated, user, token } = useSelector((state) => state.auth);
  const { balance: walletBalance } = useSelector((state) => state.wallet);

  const loadConversations = useCallback(async () => {
    if (!token) return;
    try {
      const result = await getUserConversations(token);
      if (result.success) {
        // Filter for active (open) conversations
        const activeChats = result.conversations.filter(conv => conv.status === 'open');
        setConversations(activeChats);
      }
    } catch (error) {
      console.error('Failed to load conversations:', error);
    }
  }, [token]);

  useEffect(() => {
    if (isAuthenticated && user?.id) {
      dispatch(fetchWallet({ user_id: user.id }));
      dispatch(fetchOrders({}));
      loadConversations();
    }
  }, [dispatch, isAuthenticated, loadConversations, user?.id]);

  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      if (isAuthenticated && user?.id) {
        await Promise.all([
          dispatch(fetchWallet({ user_id: user.id })),
          dispatch(fetchOrders({})),
          loadConversations()
        ]);
      }
    } catch (error) {
      console.error("Refresh error:", error);
    } finally {
      setRefreshing(false);
    }
  };

  const handleLogin = () => {
    router.push("/(auth)/login");
  };

  const handleLogout = () => setShowLogoutConfirm(true);

  const menuItems = [
    {
      icon: "person-outline",
      title: t("editProfile"),
      subtitle: t("updatePersonalInfo"),
      onPress: () => router.push("/edit-profile"),
    },
    {
      icon: "heart-outline",
      title: t("favorites"),
      subtitle: t("yourFavoriteProducts") || "Your favorite products",
      onPress: () => router.push("/favorites"),
    },
    {
      icon: "language-outline",
      title: locale === "en" ? "Language" : locale === "ar" ? "اللغة" : "زمان",
      subtitle:
        locale === "en" ? "English" : locale === "ar" ? "العربية" : "کوردی",
      onPress: () => setShowLanguageSelector(true),
    },
    {
      icon: "help-circle-outline",
      title: t("helpSupport"),
      subtitle: t("getHelp"),
      onPress: () => router.push("/help-support"),
    },
    {
      icon: "information-circle-outline",
      title: t("about"),
      subtitle: t("appVersion"),
      onPress: () => router.push("/about"),
    },
  ];

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
      {/* Header with chat button */}
      <View style={[styles.header, { backgroundColor: theme.colors.card, flexDirection: isRTL ? "row-reverse" : "row" }]}>
        <Text style={[styles.headerTitle, { color: theme.colors.text }]}>
          {t("profile")}
        </Text>
        <ChatHeaderButton onPress={() => setShowChat(true)} />
      </View>
      
      <ScrollView 
        style={styles.scrollView}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            tintColor={theme.colors.primary}
            colors={[theme.colors.primary]}
          />
        }
      >
        {/* Profile Header */}
        <View
          style={[styles.profileHeader, { backgroundColor: theme.colors.card }]}
        >
          <View style={styles.avatarContainer}>
            <View
              style={[styles.avatar, { borderColor: theme.colors.primary }]}
            >
              {isAuthenticated && user?.avatar ? (
                <Image
                  source={{
                    uri: user.avatar.startsWith("http")
                      ? user.avatar
                      : `${API_BASE_URL}${user.avatar}`,
                  }}
                  style={styles.avatarImage}
                  resizeMode="cover"
                />
              ) : (
                <Ionicons name="person" size={32} color={theme.colors.primary} />
              )}
            </View>
          </View>
          <Text style={[styles.userName, { color: theme.colors.text }]}>
            {isAuthenticated && user
              ? `${user.first_name || ""} ${user.last_name || ""}`.trim() ||
                user.username
              : t("guestUser")}
          </Text>
          <Text
            style={[styles.userEmail, { color: theme.colors.textSecondary }]}
          >
            {isAuthenticated && user ? user.email : t("notLoggedIn")}
          </Text>

          {!isAuthenticated && (
            <TouchableOpacity
              style={[
                styles.loginButtonSmall,
                { backgroundColor: theme.colors.primary },
              ]}
              onPress={handleLogin}
            >
              <Text style={styles.loginButtonSmallText}>
                {t("loginRegister")}
              </Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Wallet Card */}
        <View style={styles.walletContainer}>
          <View
            style={[
              styles.walletCard,
              {
                backgroundColor: theme.colors.primary,
              },
            ]}
          >
            <View style={[styles.walletContent, { direction: isRTL ? "rtl" : "ltr" }]}>
              <View style={[styles.walletTop, { flexDirection: isRTL ? "row-reverse" : "row" }]}>
                <View style={{ flex: 1 }}>
                  <View
                    style={{
                      flexDirection: isRTL ? "row-reverse" : "row",
                      alignItems: "center",
                      gap: 6,
                      marginBottom: 3,
                    }}
                  >
                    <Ionicons
                      name="wallet-outline"
                      size={11}
                      color="rgba(255,255,255,0.9)"
                    />
                    <Text style={[styles.walletLabel, { textAlign: isRTL ? "right" : "left" }]}>
                      {t("walletBalance")}
                    </Text>
                  </View>
                  <Text
                    style={[
                      styles.walletBalance,
                      {
                        textAlign: isRTL ? "right" : "left",
                        writingDirection: "ltr",
                      },
                    ]}
                  >
                    {showBalance
                      ? `${(walletBalance ?? 0).toLocaleString(locale || undefined)} ${t("currency") || "IQD"}`
                      : "••••••"}
                  </Text>
                </View>
                <TouchableOpacity
                  onPress={() => setShowBalance((s) => !s)}
                  style={styles.showButton}
                  accessibilityLabel={
                    showBalance
                      ? t("hideBalance") || "Hide balance"
                      : t("showBalance") || "Show balance"
                  }
                >
                  <Octicons
                    name={showBalance ? "eye-closed" : "eye"}
                    size={14}
                    color="#fff"
                  />
                </TouchableOpacity>
              </View>
              
              <View
                style={[
                  styles.walletBottom,
                  { flexDirection: isRTL ? "row-reverse" : "row" },
                ]}
              >
                <TouchableOpacity
                  style={styles.walletActionButton}
                  onPress={() => router.push("/withdraw")}
                >
                  <View style={styles.actionIconContainer}>
                    <Ionicons name="arrow-up-outline" size={16} color="#fff" />
                  </View>
                  <Text style={styles.walletButtonText}>{t("withdraw")}</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.walletActionButton}
                  onPress={() => router.push("/wallet-history")}
                >
                  <View style={styles.actionIconContainer}>
                    <Ionicons name="time-outline" size={16} color="#fff" />
                  </View>
                  <Text style={styles.walletButtonText}>{t("history")}</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </View>

        {/* Active Chats Section */}
        {isAuthenticated && conversations.length > 0 && (
          <View style={styles.chatsSection}>
            <View style={[styles.chatsSectionHeader, { flexDirection: isRTL ? "row-reverse" : "row" }]}>
              <Ionicons name="chatbubbles-outline" size={18} color={theme.colors.primary} />
              <Text style={[styles.chatsSectionTitle, { color: theme.colors.text, marginHorizontal: 8 }]}>
                {t("activeChats") || "Active Chats"}
              </Text>
              <View style={[styles.chatBadge, { backgroundColor: theme.colors.primary }]}>
                <Text style={styles.chatBadgeText}>{conversations.length}</Text>
              </View>
            </View>
            <View style={styles.chatsContainer}>
              {conversations.slice(0, 3).map((conv) => (
                <TouchableOpacity
                  key={conv.id}
                  style={[
                    styles.chatItem,
                    {
                      backgroundColor: theme.colors.card,
                      flexDirection: isRTL ? "row-reverse" : "row",
                    },
                  ]}
                  onPress={() => {
                    console.log('📱 Profile: Opening conversation:', {
                      id: conv.id,
                      order_id: conv.order_id,
                      subject: conv.subject,
                      status: conv.status
                    });
                    setSelectedConversationId(conv.id);
                    setShowChat(true);
                  }}
                >
                  <View style={[styles.chatIconContainer, { backgroundColor: theme.colors.primary + "15" }]}>
                    <Ionicons name="chatbubble-ellipses" size={20} color={theme.colors.primary} />
                  </View>
                  <View style={[styles.chatInfo, { alignItems: isRTL ? "flex-end" : "flex-start" }]}>
                    <Text
                      style={[
                        styles.chatSubject,
                        { color: theme.colors.text, textAlign: isRTL ? "right" : "left" },
                      ]}
                      numberOfLines={1}
                    >
                      {conv.subject || t("generalSupport") || "General Support"}
                    </Text>
                    <Text
                      style={[
                        styles.chatDate,
                        { color: theme.colors.textSecondary, textAlign: isRTL ? "right" : "left" },
                      ]}
                    >
                      {new Date(conv.updated_at).toLocaleDateString()}
                    </Text>
                  </View>
                  <Ionicons
                    name={isRTL ? "chevron-back" : "chevron-forward"}
                    size={18}
                    color={theme.colors.textSecondary}
                  />
                </TouchableOpacity>
              ))}
              {conversations.length > 3 && (
                <TouchableOpacity
                  style={[styles.viewAllChatsButton, { flexDirection: isRTL ? "row-reverse" : "row" }]}
                  onPress={() => setShowChat(true)}
                >
                  <Text style={[styles.viewAllChatsText, { color: theme.colors.primary }]}>
                    {t("viewAllChats") || "View All Chats"} ({conversations.length})
                  </Text>
                  <Ionicons name={isRTL ? "chevron-back" : "chevron-forward"} size={16} color={theme.colors.primary} />
                </TouchableOpacity>
              )}
            </View>
          </View>
        )}

        {/* Menu Items */}
        <View style={styles.menuContainer}>
          {menuItems.map((item, index) => (
            <TouchableOpacity
              key={index}
              style={[
                styles.menuItem,
                {
                  flexDirection: isRTL ? "row-reverse" : "row",
                },
              ]}
              onPress={item.onPress || (() => {})}
            >
              <View style={{ flexDirection: isRTL ? "row-reverse" : "row", alignItems: "center", flex: 1, gap: 12 }}>
                <Ionicons
                  name={item.icon}
                  size={22}
                  color={theme.colors.primary}
                />
                <View
                  style={[
                    styles.menuTextContainer,
                    { alignItems: isRTL ? "flex-end" : "flex-start" },
                  ]}
                >
                  <Text
                    style={[
                      styles.menuTitle,
                      { color: theme.colors.text, textAlign: isRTL ? "right" : "left" },
                    ]}
                  >
                    {item.title}
                  </Text>
                </View>
              </View>
              <Ionicons
                name={ "chevron-forward"}
                size={18}
                color={theme.colors.textSecondary}
              />
            </TouchableOpacity>
          ))}
        </View>

        {/* Logout Button */}
        {isAuthenticated && (
          <TouchableOpacity 
            style={[
              styles.menuItem,
              {
                flexDirection: isRTL ? "row-reverse" : "row",
                marginHorizontal: 16,
              },
            ]} 
            onPress={handleLogout}
          >
            <View style={{ flexDirection: isRTL ? "row-reverse" : "row", alignItems: "center", flex: 1, gap: 12 }}>
              <Ionicons name="log-out-outline" size={22} color="#FF3B30" />
              <Text style={[styles.logoutText, { flex: 1, textAlign: isRTL ? "right" : "left" }]}>{t("logout")}</Text>
            </View>
            <Ionicons
              name={isRTL ? "chevron-back" : "chevron-forward"}
              size={18}
              color={theme.colors.textSecondary}
            />
          </TouchableOpacity>
        )}

        <Text style={styles.version}>Version 1.0.0</Text>
      </ScrollView>

      {/* Language Selector Modal */}
      <LanguageSelector
        visible={showLanguageSelector}
        onClose={() => setShowLanguageSelector(false)}
      />

      <ConfirmDialog
        visible={showLogoutConfirm}
        title={t("logout") || "Logout"}
        message={t("logoutConfirm") || "Are you sure you want to logout?"}
        cancelText={t("cancel") || "Cancel"}
        confirmText={t("logout") || "Logout"}
        onCancel={() => setShowLogoutConfirm(false)}
        onConfirm={async () => {
          setShowLogoutConfirm(false);
          try {
            await dispatch(logout()).unwrap();
            router.replace("/(tabs)/home");
          } catch (error) {
            console.error("Logout error:", error);
          }
        }}
      />
      
      <ChatSupport
        visible={showChat}
        onClose={() => {
          setShowChat(false);
          setSelectedConversationId(null);
          loadConversations();
        }}
        existingConversationId={selectedConversationId}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f5f5f5",
  },
  header: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "rgba(0,0,0,0.08)",
  },
  headerTitle: {
    fontSize: 18,
  },
  scrollView: {
    flex: 1,
  },
  walletContainer: {
    marginTop: 8,
    marginBottom: 8,
    marginHorizontal: 16,
  },
  walletCard: {
    borderRadius: 14,
    padding: 0,
    overflow: "hidden",
    position: "relative",
  },
  decorativeCircle1: {},
  decorativeCircle2: {},
  walletContent: {
    padding: 14,
    position: "relative",
    zIndex: 1,
  },
  walletTop: {
    marginBottom: 10,
    alignItems: "center",
    justifyContent: "space-between",
  },
  walletLabel: {
    fontSize: 10,
    color: "rgba(255,255,255,0.9)",
    letterSpacing: 0.3,
  },
  walletBalance: {
    fontSize: 20,
    color: "#fff",
    letterSpacing: -0.3,
  },
  walletBottom: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 8,
  },
  walletActionButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 4,
    paddingVertical: 7,
    paddingHorizontal: 6,
    backgroundColor: "rgba(255,255,255,0.2)",
    borderRadius: 8,
  },
  actionIconContainer: {
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: "rgba(255,255,255,0.15)",
    justifyContent: "center",
    alignItems: "center",
  },
  walletButtonText: {
    fontSize: 10,
    color: "#fff",
    textAlign: "center",
  },
  showButton: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: "rgba(255,255,255,0.2)",
    justifyContent: "center",
    alignItems: "center",
  },
  profileHeader: {
    backgroundColor: "#fff",
    alignItems: "center",
    paddingVertical: 16,
    paddingHorizontal: 16,
  },
  avatarContainer: {
    position: "relative",
    marginBottom: 10,
  },
  avatar: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: "#E8E9F8",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 2,
    overflow: "hidden",
    // borderColor provided inline via theme
  },
  avatarImage: {
    width: "100%",
    height: "100%",
  },
  editAvatarButton: {
    position: "absolute",
    bottom: 0,
    width: 24,
    height: 24,
    borderRadius: 12,
    // backgroundColor provided inline via theme
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 2,
    borderColor: "#fff",
  },
  userName: {
    fontSize: 17,
    color: "#1a1a1a",
    marginBottom: 2,
  },
  userEmail: {
    fontSize: 12,
    color: "#666",
    marginBottom: 6,
  },
  loginButtonSmall: {
    // backgroundColor provided inline via theme
    paddingVertical: 7,
    paddingHorizontal: 18,
    borderRadius: 16,
    marginTop: 4,
  },
  loginButtonSmallText: {
    color: "#fff",
    fontSize: 13,
  },
  statsContainer: {
    flexDirection: "row",
    backgroundColor: "#fff",
    marginTop: 16,
    marginHorizontal: 16,
    borderRadius: 12,
    padding: 20,
  },
  statItem: {
    flex: 1,
    alignItems: "center",
  },
  statValue: {
    fontSize: 20,
    
    color: "#1a1a1a",
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    color: "#666",
  },
  statDivider: {
    width: 1,
    backgroundColor: "#e0e0e0",
  },
  menuContainer: {
    marginTop: 8,
    marginHorizontal: 16,
  },
  menuItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    paddingHorizontal: 4,
  },
  menuIconContainer: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "#E8E9F8",
    justifyContent: "center",
    alignItems: "center",
  },
  menuTextContainer: {
    flex: 1,
  },
  menuTitle: {
    fontSize: 15,
    color: "#1a1a1a",
  },
  menuSubtitle: {
    fontSize: 11,
    color: "#888",
  },
  logoutText: {
    fontSize: 15,
    color: "#FF3B30",
  },
  version: {
    textAlign: "center",
    color: "#999",
    fontSize: 10,
    paddingVertical: 12,
  },
  loginPrompt: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 32,
  },
  loginTitle: {
    fontSize: 28,
    
    color: "#1a1a1a",
    marginTop: 24,
    marginBottom: 8,
  },
  loginText: {
    fontSize: 16,
    color: "#666",
    textAlign: "center",
    marginBottom: 32,
  },
  loginButton: {
    // backgroundColor applied inline via theme if used
    paddingVertical: 14,
    paddingHorizontal: 48,
    borderRadius: 8,
    marginBottom: 12,
    width: "80%",
    alignItems: "center",
  },
  loginButtonText: {
    color: "#fff",
    fontSize: 16,
    
  },
  registerButton: {
    backgroundColor: "#fff",
    paddingVertical: 14,
    paddingHorizontal: 48,
    borderRadius: 8,
    borderWidth: 1,
    // borderColor applied inline via theme if used
    marginBottom: 12,
    width: "80%",
    alignItems: "center",
  },
  registerButtonText: {
    // color applied inline via theme if used
    fontSize: 16,
    
  },
  guestButton: {
    paddingVertical: 14,
    paddingHorizontal: 48,
    width: "80%",
    alignItems: "center",
  },
  guestButtonText: {
    color: "#666",
    fontSize: 14,
    
  },
  chatsSection: {
    marginTop: 8,
    marginHorizontal: 16,
    marginBottom: 8,
  },
  chatsSectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
  },
  chatsSectionTitle: {
    fontSize: 15,
  },
  chatBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 10,
    minWidth: 20,
    alignItems: "center",
  },
  chatBadgeText: {
    color: "#fff",
    fontSize: 10,
  },
  chatsContainer: {
    gap: 8,
  },
  chatItem: {
    flexDirection: "row",
    alignItems: "center",
    padding: 12,
    borderRadius: 12,
    gap: 12,
  },
  chatIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: "center",
    alignItems: "center",
  },
  chatInfo: {
    flex: 1,
  },
  chatSubject: {
    fontSize: 14,
    marginBottom: 2,
  },
  chatDate: {
    fontSize: 11,
  },
  viewAllChatsButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 10,
    gap: 4,
  },
  viewAllChatsText: {
    fontSize: 13,
  },
});
