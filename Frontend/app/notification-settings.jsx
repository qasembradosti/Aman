import React, { useState, useEffect } from "react";
import {
  View,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Switch,
  Text as RNText,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useLanguage } from "../utils/LanguageContext";
import { useTheme } from "../utils/ThemeContext";

const NOTIFICATION_STORAGE_KEY = 'notification_settings';

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

export default function NotificationSettings() {
  const router = useRouter();
  const { t, isRTL } = useLanguage();
  const { theme } = useTheme();

  // Notification settings state
  const [settings, setSettings] = useState({
    // Order notifications
    orderUpdates: true,
    orderDelivered: true,
    orderCancelled: true,
    
    // Product notifications
    newProducts: false,
    productSales: true,
    restockedProducts: false,
    
    // Promotional
    specialOffers: true,
    weeklyDeals: false,
    
    // Account
    securityAlerts: true,
    accountActivity: true,
    
    // General
    pushNotifications: true,
    emailNotifications: true,
    smsNotifications: false,
  });

  // Load settings from AsyncStorage
  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      const stored = await AsyncStorage.getItem(NOTIFICATION_STORAGE_KEY);
      if (stored) {
        setSettings(JSON.parse(stored));
      }
    } catch (error) {
      console.error('Error loading notification settings:', error);
    }
  };

  const saveSettings = async (newSettings) => {
    try {
      await AsyncStorage.setItem(NOTIFICATION_STORAGE_KEY, JSON.stringify(newSettings));
    } catch (error) {
      console.error('Error saving notification settings:', error);
    }
  };

  const toggleSetting = (key) => {
    const newSettings = {
      ...settings,
      [key]: !settings[key],
    };
    setSettings(newSettings);
    saveSettings(newSettings);
  };

  const notificationSections = [
    {
      title: t("orderNotifications") || "Order Notifications",
      items: [
        {
          key: "orderUpdates",
          icon: "cart-outline",
          title: t("orderUpdates") || "Order Updates",
          subtitle: t("orderUpdatesDesc") || "Get notified about order status changes",
        },
        {
          key: "orderDelivered",
          icon: "checkmark-circle-outline",
          title: t("orderDelivered") || "Order Delivered",
          subtitle: t("orderDeliveredDesc") || "Notification when order is delivered",
        },
        {
          key: "orderCancelled",
          icon: "close-circle-outline",
          title: t("orderCancelled") || "Order Cancelled",
          subtitle: t("orderCancelledDesc") || "Alert when order is cancelled",
        },
      ],
    },
    {
      title: t("productNotifications") || "Product Notifications",
      items: [
        {
          key: "newProducts",
          icon: "sparkles-outline",
          title: t("newProducts") || "New Products",
          subtitle: t("newProductsDesc") || "Notify when new products are added",
        },
        {
          key: "productSales",
          icon: "pricetag-outline",
          title: t("productSales") || "Sales & Discounts",
          subtitle: t("productSalesDesc") || "Get alerts about special deals",
        },
        {
          key: "restockedProducts",
          icon: "refresh-outline",
          title: t("restockedProducts") || "Restocked Products",
          subtitle: t("restockedProductsDesc") || "Know when items are back in stock",
        },
      ],
    },
    {
      title: t("promotionalNotifications") || "Promotional",
      items: [
        {
          key: "specialOffers",
          icon: "gift-outline",
          title: t("specialOffers") || "Special Offers",
          subtitle: t("specialOffersDesc") || "Exclusive deals and promotions",
        },
        {
          key: "weeklyDeals",
          icon: "calendar-outline",
          title: t("weeklyDeals") || "Weekly Deals",
          subtitle: t("weeklyDealsDesc") || "Best deals of the week",
        },
      ],
    },
    {
      title: t("accountNotifications") || "Account & Security",
      items: [
        {
          key: "securityAlerts",
          icon: "shield-checkmark-outline",
          title: t("securityAlerts") || "Security Alerts",
          subtitle: t("securityAlertsDesc") || "Important security notifications",
        },
        {
          key: "accountActivity",
          icon: "person-outline",
          title: t("accountActivity") || "Account Activity",
          subtitle: t("accountActivityDesc") || "Updates about your account",
        },
      ],
    },
    {
      title: t("notificationChannels") || "Notification Channels",
      items: [
        {
          key: "pushNotifications",
          icon: "notifications-outline",
          title: t("pushNotifications") || "Push Notifications",
          subtitle: t("pushNotificationsDesc") || "Receive notifications on your device",
        },
        {
          key: "emailNotifications",
          icon: "mail-outline",
          title: t("emailNotifications") || "Email Notifications",
          subtitle: t("emailNotificationsDesc") || "Receive notifications via email",
        },
        {
          key: "smsNotifications",
          icon: "chatbox-outline",
          title: t("smsNotifications") || "SMS Notifications",
          subtitle: t("smsNotificationsDesc") || "Receive notifications via SMS",
        },
      ],
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
      {/* Header */}
      <View style={[styles.header, { 
        backgroundColor: theme.colors.card,
        flexDirection: isRTL ? "row-reverse" : "row",
      }]}>
        <TouchableOpacity
          onPress={() => router.back()}
          style={styles.backButton}
        >
          <Ionicons
            name={isRTL ? "arrow-forward" : "arrow-back"}
            size={24}
            color={theme.colors.text}
          />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: theme.colors.text }]}>
          {t("notificationSettings") || "Notification Settings"}
        </Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView style={styles.scrollView}>
        {notificationSections.map((section, sectionIndex) => (
          <View key={sectionIndex} style={styles.section}>
            <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>
              {section.title}
            </Text>
            <View style={[styles.sectionContent, { backgroundColor: theme.colors.card }]}>
              {section.items.map((item, itemIndex) => (
                <View
                  key={item.key}
                  style={[
                    styles.settingItem,
                    {
                      flexDirection: isRTL ? "row-reverse" : "row",
                      borderBottomWidth: itemIndex < section.items.length - 1 ? 1 : 0,
                      borderBottomColor: theme.colors.border,
                    },
                  ]}
                >
                  <View style={{ flexDirection: isRTL ? "row-reverse" : "row", flex: 1, gap: 12 }}>
                    <View style={[styles.iconContainer, { backgroundColor: `${theme.colors.primary}15` }]}>
                      <Ionicons
                        name={item.icon}
                        size={22}
                        color={theme.colors.primary}
                      />
                    </View>
                    <View style={[styles.textContainer, { alignItems: isRTL ? "flex-end" : "flex-start" }]}>
                      <Text style={[styles.itemTitle, { color: theme.colors.text }]}>
                        {item.title}
                      </Text>
                      <Text style={[styles.itemSubtitle, { color: theme.colors.textSecondary }]}>
                        {item.subtitle}
                      </Text>
                    </View>
                  </View>
                  <Switch
                    value={settings[item.key]}
                    onValueChange={() => toggleSetting(item.key)}
                    trackColor={{ 
                      false: theme.colors.border, 
                      true: theme.colors.primary 
                    }}
                    thumbColor={settings[item.key] ? "#fff" : "#f4f3f4"}
                  />
                </View>
              ))}
            </View>
          </View>
        ))}

        {/* Info Section */}
        <View style={styles.infoSection}>
          <Ionicons name="information-circle-outline" size={20} color={theme.colors.textSecondary} />
          <Text style={[styles.infoText, { color: theme.colors.textSecondary }]}>
            {t("notificationSettingsInfo") || "You can change these settings at any time. Some notifications like security alerts cannot be disabled."}
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  backButton: {
    padding: 4,
  },
  headerTitle: {
    fontSize: 18,
    
  },
  scrollView: {
    flex: 1,
  },
  section: {
    marginTop: 20,
    paddingHorizontal: 16,
  },
  sectionTitle: {
    fontSize: 16,
    
    marginBottom: 12,
    paddingHorizontal: 4,
  },
  sectionContent: {
    borderRadius: 12,
    overflow: "hidden",
  },
  settingItem: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
    gap: 12,
  },
  iconContainer: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: "center",
    alignItems: "center",
  },
  textContainer: {
    flex: 1,
  },
  itemTitle: {
    fontSize: 15,
    
    marginBottom: 4,
  },
  itemSubtitle: {
    fontSize: 13,
    lineHeight: 18,
  },
  infoSection: {
    flexDirection: "row",
    padding: 16,
    marginTop: 20,
    marginHorizontal: 16,
    marginBottom: 20,
    gap: 12,
  },
  infoText: {
    flex: 1,
    fontSize: 13,
    lineHeight: 20,
  },
});
