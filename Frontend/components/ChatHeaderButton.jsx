import React from "react";
import { TouchableOpacity, View, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useSelector } from "react-redux";
import { useTheme } from "../utils/ThemeContext";

export default function ChatHeaderButton({ onPress }) {
  const { theme } = useTheme();
  const { activeConversationId } = useSelector((state) => state.chat);

  if (!activeConversationId) return null;

  return (
    <TouchableOpacity
      onPress={onPress}
      style={[
        styles.container,
        {
          backgroundColor: theme.colors.primary + "15",
          borderColor: theme.colors.primary,
        },
      ]}
    >
      <View style={styles.iconContainer}>
        <Ionicons
          name="chatbubble-ellipses"
          size={20}
          color={theme.colors.primary}
        />
        <View
          style={[
            styles.badge,
            { backgroundColor: theme.colors.success },
          ]}
        />
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 1,
    justifyContent: "center",
    alignItems: "center",
    marginHorizontal: 8,
  },
  iconContainer: {
    position: "relative",
  },
  badge: {
    position: "absolute",
    top: -2,
    right: -2,
    width: 8,
    height: 8,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: "white",
  },
});
