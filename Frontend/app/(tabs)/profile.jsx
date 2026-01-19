import {
  View,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  Text as RNText,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons, Octicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { logout } from "../../store/slices/authSlice";
import { fetchWallet } from "../../store/slices/walletSlice";
import { fetchOrders } from "../../store/slices/ordersSlice";
import { useLanguage } from "../../utils/LanguageContext";
import { useTheme } from "../../utils/ThemeContext";
import LanguageSelector from "../../components/LanguageSelector";
import ConfirmDialog from "../../components/ui/ConfirmDialog";
import { History } from "lucide-react-native";
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

  // Get auth state from Redux
  const { isAuthenticated, user, loading } = useSelector((state) => state.auth);
  const { balance: walletBalance, loading: walletLoading } = useSelector((state) => state.wallet);
  const { items: orders } = useSelector((state) => state.orders);
  
  useEffect(() => {
    if (isAuthenticated && user?.id) {
      dispatch(fetchWallet({ user_id: user.id }));
      dispatch(fetchOrders({}));
    }
  }, [isAuthenticated, user?.id, dispatch]);

  // Calculate statistics from orders
  const totalOrders = orders?.length || 0;
  const pendingOrders = orders?.filter(order => order.status === 'pending')?.length || 0;
  const totalSales = orders?.reduce((sum, order) => sum + (parseFloat(order.total_amount) || 0), 0) || 0;

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
      icon: "notifications-outline",
      title: t("notifications"),
      subtitle: t("customizeNotifications"),
      onPress: () => router.push("/notification-settings"),
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
      <ScrollView style={styles.scrollView}>
        {/* Profile Header */}
        <View
          style={[styles.profileHeader, { backgroundColor: theme.colors.card }]}
        >
          <View style={styles.avatarContainer}>
            <View
              style={[styles.avatar, { borderColor: theme.colors.primary }]}
            >
              <Ionicons name="person" size={40} color={theme.colors.primary} />
            </View>
            <TouchableOpacity
              style={[
                styles.editAvatarButton,
                { backgroundColor: theme.colors.primary },
              ]}
            >
              <Ionicons name="camera" size={16} color="#fff" />
            </TouchableOpacity>
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
                  <Text style={[styles.walletLabel, { textAlign: isRTL ? "right" : "left" }]}>
                    <Ionicons name="wallet-outline" size={12} color="rgba(255,255,255,0.9)" />
                    {"  "}{t("walletBalance")}
                  </Text>
                  <Text style={[styles.walletBalance, { textAlign: isRTL ? "right" : "left" }]}>
                    {showBalance ? `${(walletBalance ?? 0).toLocaleString()} ${t("currency") || "IQD"}` : "••••••"}
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
                    size={16}
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
                    <Ionicons name="arrow-up-outline" size={18} color="#fff" />
                  </View>
                  <Text style={styles.walletButtonText}>{t("withdraw")}</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.walletActionButton}
                  onPress={() => router.push("/wallet-history")}
                >
                  <View style={styles.actionIconContainer}>
                    <Ionicons name="time-outline" size={18} color="#fff" />
                  </View>
                  <Text style={styles.walletButtonText}>{t("history")}</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </View>

        {/* Stats */}
        <View
          style={[
            styles.statsContainer,
            { backgroundColor: theme.colors.card },
          ]}
        >
          <View style={styles.statItem}>
            <Text style={[styles.statValue, { color: theme.colors.text }]}>
              {totalOrders}
            </Text>
            <Text
              style={[styles.statLabel, { color: theme.colors.textSecondary }]}
            >
              {t("orders")}
            </Text>
          </View>
          <View
            style={[
              styles.statDivider,
              { backgroundColor: theme.colors.border },
            ]}
          />
          <View style={styles.statItem}>
            <Text style={[styles.statValue, { color: theme.colors.text }]}>
              {pendingOrders}
            </Text>
            <Text
              style={[styles.statLabel, { color: theme.colors.textSecondary }]}
            >
              {t("pending")}
            </Text>
          </View>
          <View
            style={[
              styles.statDivider,
              { backgroundColor: theme.colors.border },
            ]}
          />
          <View style={styles.statItem}>
            <Text style={[styles.statValue, { color: theme.colors.text }]}>
              {totalSales.toLocaleString()} {t("currency") || "IQD"}
            </Text>
            <Text
              style={[styles.statLabel, { color: theme.colors.textSecondary }]}
            >
              {t("totalSpent")}
            </Text>
          </View>
        </View>

        {/* Menu Items */}
        <View style={styles.menuContainer}>
          {menuItems.map((item, index) => (
            <TouchableOpacity
              key={index}
              style={[
                styles.menuItem,
                {
                  backgroundColor: theme.colors.card,
                  flexDirection: isRTL ? "row-reverse" : "row",
                },
              ]}
              onPress={item.onPress || (() => {})}
            >
              <View style={{ flexDirection: isRTL ? "row-reverse" : "row", alignItems: "center", flex: 1,gap:10 }}>
                <View style={styles.menuIconContainer}>
                  <Ionicons
                    name={item.icon}
                    size={24}
                    color={theme.colors.primary}
                  />
                </View>
                <View
                  style={[
                    styles.menuTextContainer,
                    { alignItems: isRTL ? "flex-end" : "flex-start" },
                  ]}
                >
                  <Text
                    style={[styles.menuTitle, { color: theme.colors.text }]}
                  >
                    {item.title}
                  </Text>
                  <Text
                    style={[
                      styles.menuSubtitle,
                      { color: theme.colors.textSecondary },
                    ]}
                  >
                    {item.subtitle}
                  </Text>
                </View>
              </View>
              <Ionicons
                name={isRTL ? "chevron-back" : "chevron-forward"}
                size={20}
                color="#ccc"
              />
            </TouchableOpacity>
          ))}
        </View>

        {/* Logout Button */}
        {isAuthenticated && (
          <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
            <Ionicons name="log-out-outline" size={20} color="#FF3B30" />
            <Text style={styles.logoutText}>{t("logout")}</Text>
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
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f5f5f5",
  },
  scrollView: {
    flex: 1,
  },
  walletContainer: {
    marginTop: 12,
    marginBottom: 12,
    marginHorizontal: 16,
  },
  walletCard: {
    borderRadius: 20,
    padding: 0,
    overflow: "hidden",
    position: "relative",
  },
  decorativeCircle1: {},
  decorativeCircle2: {},
  walletContent: {
    padding: 16,
    position: "relative",
    zIndex: 1,
  },
  walletTop: {
    marginBottom: 16,
    alignItems: "center",
    justifyContent: "space-between",
  },
  walletLabel: {
    fontSize: 11,
    color: "rgba(255,255,255,0.9)",
    marginBottom: 6,
    
    letterSpacing: 0.5,
  },
  walletBalance: {
    fontSize: 28,
    color: "#fff",
    
    letterSpacing: -0.5,
  },
  walletBottom: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 10,
  },
  walletActionButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 10,
    paddingHorizontal: 8,
    backgroundColor: "rgba(255,255,255,0.25)",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.3)",
  },
  actionIconContainer: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: "rgba(255,255,255,0.2)",
    justifyContent: "center",
    alignItems: "center",
  },
  walletButtonText: {
    fontSize: 11,
    color: "#fff",
    
    textAlign: "center",
  },
  showButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "rgba(255,255,255,0.25)",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.3)",
  },
  profileHeader: {
    backgroundColor: "#fff",
    alignItems: "center",
    paddingVertical: 32,
    paddingHorizontal: 20,
  },
  avatarContainer: {
    position: "relative",
    marginBottom: 16,
  },
  avatar: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: "#E8E9F8",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 3,
    // borderColor provided inline via theme
  },
  editAvatarButton: {
    position: "absolute",
    bottom: 0,
    right: 0,
    width: 32,
    height: 32,
    borderRadius: 16,
    // backgroundColor provided inline via theme
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 3,
    borderColor: "#fff",
  },
  userName: {
    fontSize: 24,
    color: "#1a1a1a",
    marginBottom: 4,
  },
  userEmail: {
    fontSize: 14,
    color: "#666",
    marginBottom: 12,
  },
  loginButtonSmall: {
    // backgroundColor provided inline via theme
    paddingVertical: 10,
    paddingHorizontal: 24,
    borderRadius: 20,
    marginTop: 4,
  },
  loginButtonSmallText: {
    color: "#fff",
    fontSize: 14,
    
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
    marginTop: 16,
    marginHorizontal: 16,
    backgroundColor: "#fff",
    borderRadius: 12,
    overflow: "hidden",
  },
  menuItem: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#f0f0f0",
  },
  menuIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#E8E9F8",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  menuTextContainer: {
    flex: 1,
  },
  menuTitle: {
    fontSize: 16,
    
    color: "#1a1a1a",
    marginBottom: 2,
  },
  menuSubtitle: {
    fontSize: 12,
    color: "#666",
  },
  logoutButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#fff",
    marginHorizontal: 16,
    marginTop: 16,
    marginBottom: 8,
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#FF3B30",
  },
  logoutText: {
    fontSize: 16,
    
    color: "#FF3B30",
    marginLeft: 8,
  },
  version: {
    textAlign: "center",
    color: "#999",
    fontSize: 12,
    paddingVertical: 20,
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
});
