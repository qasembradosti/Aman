import React from "react";
import { View, StyleSheet, ActivityIndicator, Pressable } from "react-native";
import { WifiOff, RefreshCcw } from "lucide-react-native";
import * as Haptics from "expo-haptics";
import { useTheme } from "../utils/ThemeContext";
import { Text } from "./ui/Text";

export default function OfflineSplash({ checking = false, onRetry }) {
  const { theme } = useTheme();

  const handleRetry = async () => {
    try {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } catch {}
    onRetry && onRetry();
  };

  return (
    <View
      style={[styles.container, { backgroundColor: theme.colors.background }]}
    >
      {/* Decorative background blobs */}
      <View
        style={[
          styles.blob,
          styles.blobTopRight,
          { backgroundColor: theme.colors.primary, opacity: 0.08 },
        ]}
      />
      <View
        style={[
          styles.blob,
          styles.blobBottomLeft,
          {
            backgroundColor: theme.colors.accent || theme.colors.primary,
            opacity: 0.06,
          },
        ]}
      />

      <View
        style={[
          styles.card,
          {
            backgroundColor: theme.isDark
              ? "rgba(20,20,24,0.7)"
              : "rgba(255,255,255,0.9)",
            alignSelf: "center",
            maxWidth: 360,
          },
        ]}
      >
        <View
          style={[
            styles.iconWrap,
            { borderColor: theme.colors.primary + "33" },
          ]}
        >
          <View
            style={[
              styles.iconBadge,
              {
                backgroundColor: theme.colors.primary + "14",
                width: 96,
                height: 96,
                borderRadius: 64,
              },
            ]}
          >
            <WifiOff size={56} color={theme.colors.primary} />
          </View>
        </View>

        <Text
          style={[
            styles.title,
            {
              color: theme.colors.text,
              textAlign: "center",
              lineHeight: 26,
              maxWidth: 300,
            },
          ]}
        >
          {checking ? "Checking connection…" : "You’re offline"}
        </Text>
        <Text
          style={[
            styles.message,
            {
              color: theme.colors.textSecondary || theme.colors.text,
              textAlign: "center",
              marginTop: 4,
              lineHeight: 20,
              maxWidth: 320,
            },
          ]}
        >
          {checking
            ? "Please wait while we verify internet access."
            : "No internet connection detected. Check Wi‑Fi or mobile data and try again."}
        </Text>

        <View style={styles.actions}>
          {checking ? (
            <ActivityIndicator
              color={theme.colors.primary}
              style={{ alignSelf: "center" }}
            />
          ) : (
            <Pressable
              onPress={handleRetry}
              accessibilityRole="button"
              accessibilityLabel="Retry connection"
              android_ripple={{
                color: "rgba(255,255,255,0.2)",
                borderless: false,
              }}
              style={({ pressed }) => [
                styles.primaryButton,
                { backgroundColor: theme.colors.primary },
                pressed && { transform: [{ scale: 0.98 }], opacity: 0.95 },
              ]}
            >
              <RefreshCcw size={20} color="#fff" />
              <Text style={[styles.primaryButtonText, { color: "#fff" }]}>
                Retry
              </Text>
            </Pressable>
          )}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 24,
  },
  blob: {
    position: "absolute",
    width: 240,
    height: 240,
    borderRadius: 200,
    zIndex: 0,
  },
  blobTopRight: {
    top: -60,
    right: -60,
  },
  blobBottomLeft: {
    bottom: -80,
    left: -80,
  },
  card: {
    width: "100%",
    borderRadius: 16,
    paddingVertical: 28,
    paddingHorizontal: 20,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "rgba(0,0,0,0.06)",
  },
  iconWrap: {
    padding: 10,
    borderRadius: 999,
    borderWidth: 1,
    marginBottom: 12,
  },
  iconBadge: {
    width: 88,
    height: 88,
    borderRadius: 64,
    alignItems: "center",
    justifyContent: "center",
  },
  title: {
    fontSize: 20,
    
    marginBottom: 8,
    textAlign: "center",
  },
  message: {
    fontSize: 14,
    opacity: 0.8,
    textAlign: "center",
  },
  actions: {
    marginTop: 20,
  },
  primaryButton: {
    flexDirection: "row",
    height: "auto",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingHorizontal: 18,
    paddingVertical: 12,
    borderRadius: 12,
    minWidth: 160,
    shadowColor: "#000",
    shadowOpacity: 0.15,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 4,
  },
  primaryButtonText: {
    fontSize: 15,
    letterSpacing: 0.3,
    marginLeft: 8,
  },
});
