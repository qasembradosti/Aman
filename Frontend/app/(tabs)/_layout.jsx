import { Tabs } from "expo-router";
import { Ionicons, FontAwesome6 } from "@expo/vector-icons";
import { useTheme } from "../../utils/ThemeContext";
import { LayoutGrid } from "lucide-react-native";
import { useLanguage } from "../../utils/LanguageContext";

export default function TabLayout() {
  const { t, isRTL, fontFamilyName } = useLanguage();
  const { theme, isDark } = useTheme();
  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: theme.colors.primary,
        tabBarInactiveTintColor: isDark ? "#8E8E93" : "#8E8E93",
        headerShown: false,
        tabBarStyle: {
          backgroundColor: theme.colors.card,
          borderTopWidth: 1,
          borderTopColor: theme.colors.border,
          paddingBottom: 5,
          paddingTop: 5,
          height: 60,
        },
        tabBarLabelStyle: {
          fontFamily: fontFamilyName,
          // Ensure proper label rendering in RTL
          writingDirection: isRTL ? "rtl" : "ltr",
        },
      }}
    >
      <Tabs.Screen
        name="home"
        options={{
          title: t("home"),
          headerShown: false,
          tabBarIcon: ({ color, focused }) => (
            <LayoutGrid size={24} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="rank"
        options={{
          title: t("rankings"),
          headerShown: false,
          tabBarIcon: ({ color, focused }) => (
            <FontAwesome6 name={"medal"} size={24} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="search"
        options={{
          title: t("search"),
          tabBarIcon: ({ color, focused }) => (
            <Ionicons
              name={focused ? "search" : "search-outline"}
              size={24}
              color={color}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="orders"
        options={{
          title: t("orders"),
          tabBarIcon: ({ color, focused }) => (
            <Ionicons
              name={focused ? "receipt" : "receipt-outline"}
              size={24}
              color={color}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: t("profile"),
          tabBarIcon: ({ color, focused }) => (
            <Ionicons
              name={focused ? "person" : "person-outline"}
              size={24}
              color={color}
            />
          ),
        }}
      />
    </Tabs>
  );
}
