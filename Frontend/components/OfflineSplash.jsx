import React, { useEffect, useRef } from "react";
import {
  View,
  StyleSheet,
  ActivityIndicator,
  Pressable,
  Animated,
} from "react-native";
import { WifiOff, RefreshCcw } from "lucide-react-native";
import { LinearGradient } from "expo-linear-gradient";
import * as Haptics from "expo-haptics";
import { useTheme } from "../utils/ThemeContext";
import { Text } from "./ui/Text";

export default function OfflineSplash({ checking = false, onRetry }) {
  const { theme, isDark } = useTheme();
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.9)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const spinAnim = useRef(new Animated.Value(0)).current;
  const dot1 = useRef(new Animated.Value(0)).current;
  const dot2 = useRef(new Animated.Value(0)).current;
  const dot3 = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 600,
        useNativeDriver: true,
      }),
      Animated.spring(scaleAnim, {
        toValue: 1,
        friction: 8,
        tension: 40,
        useNativeDriver: true,
      }),
    ]).start();

    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.1,
          duration: 1500,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 1500,
          useNativeDriver: true,
        }),
      ]),
    ).start();

    // Spinning animation for loading circle
    Animated.loop(
      Animated.timing(spinAnim, {
        toValue: 1,
        duration: 1200,
        useNativeDriver: true,
      })
    ).start();

    // Bouncing dots animation
    const animateDot = (dot, delay) => {
      Animated.loop(
        Animated.sequence([
          Animated.delay(delay),
          Animated.timing(dot, {
            toValue: 1,
            duration: 400,
            useNativeDriver: true,
          }),
          Animated.timing(dot, {
            toValue: 0,
            duration: 400,
            useNativeDriver: true,
          }),
        ])
      ).start();
    };

    animateDot(dot1, 0);
    animateDot(dot2, 150);
    animateDot(dot3, 300);
  }, [fadeAnim, scaleAnim, pulseAnim, spinAnim, dot1, dot2, dot3]);

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
            <View style={styles.customLoader}>
              <Animated.View
                style={[
                  styles.spinnerCircle,
                  {
                    borderColor: theme.colors.primary,
                    borderTopColor: 'transparent',
                    transform: [
                      {
                        rotate: spinAnim.interpolate({
                          inputRange: [0, 1],
                          outputRange: ['0deg', '360deg'],
                        }),
                      },
                    ],
                  },
                ]}
              />
              <View style={styles.dotsContainer}>
                <Animated.View
                  style={[
                    styles.dot,
                    {
                      backgroundColor: theme.colors.primary,
                      transform: [
                        {
                          translateY: dot1.interpolate({
                            inputRange: [0, 1],
                            outputRange: [0, -10],
                          }),
                        },
                        {
                          scale: dot1.interpolate({
                            inputRange: [0, 1],
                            outputRange: [1, 1.3],
                          }),
                        },
                      ],
                    },
                  ]}
                />
                <Animated.View
                  style={[
                    styles.dot,
                    {
                      backgroundColor: theme.colors.primary,
                      transform: [
                        {
                          translateY: dot2.interpolate({
                            inputRange: [0, 1],
                            outputRange: [0, -10],
                          }),
                        },
                        {
                          scale: dot2.interpolate({
                            inputRange: [0, 1],
                            outputRange: [1, 1.3],
                          }),
                        },
                      ],
                    },
                  ]}
                />
                <Animated.View
                  style={[
                    styles.dot,
                    {
                      backgroundColor: theme.colors.primary,
                      transform: [
                        {
                          translateY: dot3.interpolate({
                            inputRange: [0, 1],
                            outputRange: [0, -10],
                          }),
                        },
                        {
                          scale: dot3.interpolate({
                            inputRange: [0, 1],
                            outputRange: [1, 1.3],
                          }),
                        },
                      ],
                    },
                  ]}
                />
              </View>
              <Text style={[styles.checkingText, { color: theme.colors.textSecondary }]}>
                Checking connection...
              </Text>
            </View>
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
                pressed,
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
    width: 280,
    height: 280,
    borderRadius: 140,
    zIndex: 0,
  },
  blobTopRight: {
    top: -80,
    right: -80,
  },
  blobBottomLeft: {
    bottom: -100,
    left: -100,
  },
  card: {
    width: "100%",
    maxWidth: 400,
    borderRadius: 25,
    paddingVertical: 48,
    paddingHorizontal: 32,
    alignItems: "center",
    justifyContent: "center",
  },
  iconContainer: {
    position: "relative",
    marginBottom: 32,
  },
  iconGlow: {
    position: "absolute",
    width: 140,
    height: 140,
    borderRadius: 70,
    top: -20,
    left: -20,
    zIndex: -1,
  },
  iconBadge: {
    width: 120,
    height: 120,
    borderRadius: 60,
    alignItems: "center",
    justifyContent: "center",
  },
  title: {
    fontSize: 28,
    marginBottom: 12,
    textAlign: "center",
    letterSpacing: 0.5,
  },
  message: {
    fontSize: 15,
    textAlign: "center",
    lineHeight: 22,
    opacity: 0.85,
    paddingHorizontal: 16,
  },
  actions: {
    marginTop: 32,
    width: "100%",
  },
  customLoader: {
    alignItems: "center",
    gap: 16,
  },
  spinnerCircle: {
    width: 50,
    height: 50,
    borderRadius: 25,
    borderWidth: 4,
    borderColor: "#4a90e2",
    borderTopColor: "transparent",
  },
  dotsContainer: {
    flexDirection: "row",
    gap: 8,
    marginTop: 8,
  },
  dot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  checkingText: {
    fontSize: 14,
    marginTop: 8,
  },
  loadingContainer: {
    alignItems: "center",
    gap: 12,
  },
  loadingText: {
    fontSize: 14,
  },
  primaryButton: {
    width: "100%",
    borderRadius: 16,
    overflow: "hidden",
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: 10,
    paddingVertical: 14,
  },
  buttonGradient: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    paddingVertical: 16,
    paddingHorizontal: 32,
  },
  primaryButtonText: {
    fontSize: 17,
    color: "#ffffff",
    letterSpacing: 0.5,
  },
});
