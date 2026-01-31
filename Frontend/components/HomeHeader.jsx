import React, { useEffect } from "react";
import { View, StyleSheet, Pressable } from "react-native";
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import { useTheme } from "../utils/ThemeContext";
import { useLanguage } from "../utils/LanguageContext";
import { useSelector, useDispatch } from "react-redux";
import { Text } from "./ui/Text";
import { Moon, Sun, Bell, Search, Sparkles, Shield } from "lucide-react-native";
import { fetchUnreadCount } from "../store/slices/notificationsSlice";
import AmanLogo from "../assets/images/aman-app.png";
export default function HomeHeader({ onToggleTheme }) {
  const router = useRouter();
  const dispatch = useDispatch();
  const { theme, isDark } = useTheme();
  const { isRTL, t } = useLanguage();
  const { isAuthenticated } = useSelector((state) => state.auth);
  const { unreadCount } = useSelector((state) => state.notifications);

  // Fetch unread count on mount and when authenticated
  useEffect(() => {
    if (isAuthenticated) {
      dispatch(fetchUnreadCount());
    }
  }, [isAuthenticated, dispatch]);

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.card }]}>
      <View style={[styles.topRow]}>
        <View style={[styles.headerLeft]}>
          <View
            style={[
              styles.logoContainer,
              {
                backgroundColor: isDark
                  ? "rgba(255, 255, 255, 0.1)"
                  : "rgba(0, 0, 0, 0.05)",
              },
            ]}
          >
            <Image source={AmanLogo} style={styles.logo} />
          </View>
          <View style={styles.titleContainer}>
            <Text
              style={[
                styles.title,
                { color: theme.colors.primary, fontFamily: "System" },
              ]}
              numberOfLines={2}
            >
              Aman
            </Text>
            <View style={styles.subtitleRow}>
              <Shield
                size={12}
                color={isDark ? "#9CA3AF" : "#6B7280"}
                strokeWidth={2.5}
              />
              <Text
                style={[styles.subtitle, { color: theme.colors.textSecondary }]}
              >
                {t("welcomeBack")}
              </Text>
            </View>
          </View>
        </View>
        <View style={[styles.actions]}>
          <Pressable
            onPress={() => router.push("/notifications")}
            style={({ pressed }) => [
              styles.iconButton,
              {
                backgroundColor: isDark
                  ? "rgba(255,255,255,0.1)"
                  : "rgba(0,0,0,0.05)",
                borderWidth: 1,
                borderColor: isDark
                  ? "rgba(255,255,255,0.1)"
                  : "rgba(0,0,0,0.06)",
              },
              pressed && styles.pressed,
            ]}
            accessibilityLabel={t("notifications") || "Notifications"}
            accessibilityRole="button"
          >
            <View>
              <Bell size={22} color={theme.colors.text} strokeWidth={2} />
              {/* Notification Badge */}
              {unreadCount > 0 && (
                <View
                  style={[
                    styles.badge,
                    {
                      backgroundColor: "#EF4444",
                      borderColor: theme.colors.card,
                    },
                  ]}
                >
                  <Text style={styles.badgeText}>
                    {unreadCount > 99 ? "99+" : unreadCount}
                  </Text>
                </View>
              )}
            </View>
          </Pressable>
          <Pressable
            onPress={onToggleTheme}
            style={({ pressed }) => [
              styles.iconButton,
              {
                backgroundColor: isDark
                  ? "rgba(255,255,255,0.1)"
                  : "rgba(0,0,0,0.05)",
                borderWidth: 1,
                borderColor: isDark
                  ? "rgba(255,255,255,0.1)"
                  : "rgba(0,0,0,0.06)",
              },
              pressed && styles.pressed,
            ]}
            accessibilityLabel={
              isDark
                ? t("switchToLightMode") || "Switch to light mode"
                : t("switchToDarkMode") || "Switch to dark mode"
            }
            accessibilityRole="button"
          >
            {isDark ? (
              <Moon size={22} color={theme.colors.text} strokeWidth={2} />
            ) : (
              <Sun size={22} color={theme.colors.text} strokeWidth={2} />
            )}
          </Pressable>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "rgba(0,0,0,0.08)",
  },
  topRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  headerLeft: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
  },
  logoContainer: {
    width: 40,
    height: 40,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  logo: {
    width: 50,
    height: 50,
    resizeMode: "contain",
    borderRadius: 12,
  },
  titleContainer: {
    justifyContent: "center",
  },
  title: {
    fontSize: 20,

    letterSpacing: -0.8,
    marginBottom: 2,
  },
  subtitleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  subtitle: {
    fontSize: 11,

    letterSpacing: 0.3,
  },
  actions: {
    flexDirection: "row",
    gap: 10,
  },
  iconButton: {
    width: 44,
    height: 44,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  pressed: {
    transform: [{ scale: 0.94 }],
    opacity: 0.7,
  },
  badge: {
    position: "absolute",
    top: -6,
    right: -6,
    minWidth: 18,
    height: 18,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 4,
    borderWidth: 2.5,
    borderColor: "#fff",
  },
  badgeText: {
    color: "#fff",
    fontSize: 10,
  },
  statsRow: {
    flexDirection: "row",
    gap: 12,
    marginTop: 4,
  },
  statCard: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 8,
    borderRadius: 12,
    alignItems: "center",
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 3 },
    elevation: 2,
  },
  statValue: {
    fontSize: 18,

    marginBottom: 2,
  },
  statLabel: {
    fontSize: 11,

    textTransform: "capitalize",
  },
});
