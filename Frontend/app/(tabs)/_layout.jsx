import { Tabs } from "expo-router";
import { Ionicons, FontAwesome6 } from "@expo/vector-icons";
import { useTheme } from "../../utils/ThemeContext";
import { LayoutGrid } from "lucide-react-native";
import { useLanguage } from "../../utils/LanguageContext";
import { Platform } from "react-native";

export default function TabLayout() {
  const { t, isRTL, fontFamilyName } = useLanguage();
  const { theme, isDark } = useTheme();
  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: theme.colors.primary,
        tabBarInactiveTintColor: isDark ? "#8E8E93" : "#A0A0A0",
        headerShown: false,
        tabBarStyle: {
          backgroundColor: theme.colors.card,
          borderTopWidth: 0,
          paddingBottom: Platform.OS === 'ios' ? 20 : 8,
          paddingTop: 6,
          height: Platform.OS === 'ios' ? 80 : 62,
          borderRadius: 20,
          position: 'absolute',
          marginBottom: 6,
          marginHorizontal: 6,
          elevation: 2,
          shadowColor: '#000',
          shadowOffset: { width: 0, height: -8 },
          shadowOpacity: 1,
          shadowRadius: 16,
        },
        tabBarLabelStyle: {
          fontFamily: fontFamilyName,
          fontSize: 9,
          fontWeight: '700',
          marginTop: 3,
          writingDirection: isRTL ? "rtl" : "ltr",
          letterSpacing: 0.2,
        },
        tabBarIconStyle: {
          marginTop: 2,
        },
        tabBarItemStyle: {
          paddingVertical: 0,
        },
      }}
    >
      <Tabs.Screen
        name="home"
        options={{
          title: t("home"),
          headerShown: false,
          tabBarIcon: ({ color, focused }) => (
            <LayoutGrid 
              size={focused ? 21 : 20} 
              color={color} 
              strokeWidth={focused ? 2.5 : 2}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="rank"
        options={{
          title: t("rankings"),
          headerShown: false,
          tabBarIcon: ({ color, focused }) => (
            <FontAwesome6 
              name={"medal"} 
              size={focused ? 21 : 20} 
              color={color} 
            />
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
              size={focused ? 21 : 20}
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
              size={focused ? 21 : 20}
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
              size={focused ? 21 : 20}
              color={color}
            />
          ),
        }}
      />
    </Tabs>
  );
}
