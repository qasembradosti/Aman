import React, { useEffect, useState } from "react";
import {
  View,
  StyleSheet,
  Dimensions,
  Text,
  ActivityIndicator,
  Animated,
  Image,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import NetInfo from "@react-native-community/netinfo";

const { width, height } = Dimensions.get("window");

const PRIMARY_COLOR = "#ee7301ff";
const FULL_TEXT = "Aman Store";

export default function SplashScreen() {
  const router = useRouter();
  const [fadeAnim] = useState(new Animated.Value(0));
  const [scaleAnim] = useState(new Animated.Value(0.3));
  const [slideAnim] = useState(new Animated.Value(50));
  const [textOpacityAnim] = useState(new Animated.Value(0));
  const [textScaleAnim] = useState(new Animated.Value(0.5));
  const [displayedText, setDisplayedText] = useState("");
  const [isConnected, setIsConnected] = useState(true);
  const [checked, setChecked] = useState(false);

  // Check internet connection
  useEffect(() => {
    const checkConnection = async () => {
      const state = await NetInfo.fetch();
      const connected = state.isConnected ?? false;
      setIsConnected(connected);
      setChecked(true);

      // If no connection, navigate to no-connection page after 2 seconds
      if (!connected) {
        setTimeout(() => {
          router.replace("/(auth)/no-connection");
        }, 2000);
      }
    };

    checkConnection();
  }, [router]);

  // Smooth typing animation with character-by-character reveal
  useEffect(() => {
    let index = 0;
    const timer = setInterval(() => {
      if (index < FULL_TEXT.length) {
        setDisplayedText(FULL_TEXT.substring(0, index + 1));
        index++;
      } else {
        clearInterval(timer);
      }
    }, 90);

    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    Animated.sequence([
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 800,
          useNativeDriver: true,
        }),
        Animated.timing(scaleAnim, {
          toValue: 1,
          duration: 1000,
          useNativeDriver: true,
        }),
      ]),
      Animated.parallel([
        Animated.timing(slideAnim, {
          toValue: 0,
          duration: 600,
          useNativeDriver: true,
        }),
        Animated.timing(textOpacityAnim, {
          toValue: 1,
          duration: 700,
          useNativeDriver: true,
        }),
        Animated.timing(textScaleAnim, {
          toValue: 1,
          duration: 700,
          useNativeDriver: true,
        }),
      ]),
    ]).start();
  }, [fadeAnim, scaleAnim, slideAnim, textOpacityAnim, textScaleAnim]);

  return (
    <LinearGradient
      colors={[PRIMARY_COLOR, "#ff9c2e"]}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={styles.container}
    >
      {/* Background decorative elements */}
      <View style={styles.decorationTop} />
      <View style={styles.decorationBottom} />

      <Animated.View
        style={[
          styles.content,
          {
            opacity: fadeAnim,
            transform: [{ scale: scaleAnim }, { translateY: slideAnim }],
          },
        ]}
      >
        {/* Logo */}
        <View style={styles.logoContainer}>
          <Image
            source={require("../assets/images/aman-app.png")}
            style={styles.logoImage}
            resizeMode="contain"
          />
        </View>

        {/* Typing Text Animation */}
        <View style={styles.textAnimationContainer}>
          <Text style={styles.typingText}>{displayedText}</Text>
          {displayedText.length < FULL_TEXT.length && (
            <Text style={styles.cursor}>|</Text>
          )}
        </View>

        {/* Tagline */}
        <Text style={styles.tagline}>Your trusted marketplace</Text>

        {/* Loading Indicator */}
        <View style={styles.loaderContainer}>
          {isConnected ? (
            <View style={styles.dotContainer}>
              <View style={[styles.dot, styles.dot1]} />
              <View style={[styles.dot, styles.dot2]} />
              <View style={[styles.dot, styles.dot3]} />
            </View>
          ) : (
            <Text style={styles.noConnectionText}>No Internet Connection</Text>
          )}
        </View>
      </Animated.View>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    width,
    height,
    justifyContent: "center",
    alignItems: "center",
    overflow: "hidden",
  },
  decorationTop: {
    position: "absolute",
    top: -50,
    right: -50,
    width: 250,
    height: 250,
    borderRadius: 125,
    backgroundColor: "rgba(255, 255, 255, 0.1)",
  },
  decorationBottom: {
    position: "absolute",
    bottom: -80,
    left: -80,
    width: 300,
    height: 300,
    borderRadius: 150,
    backgroundColor: "rgba(255, 255, 255, 0.08)",
  },
  content: {
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 20,
  },
  logoContainer: {
    marginBottom: 50,
    justifyContent: "center",
    alignItems: "center",
  },
  logoImage: {
    width: 120,
    height: 120,
    borderRadius: 20,
  },
  textAnimationContainer: {
    marginBottom: 50,
    flexDirection: "row",
    alignItems: "center",
    minHeight: 50,
    justifyContent: "center",
  },
  typingText: {
    fontSize: 40,
    color: "#ffffff",
    letterSpacing: 1,
    lineHeight: 48,
  },
  cursor: {
    fontSize: 40,
    color: "#ffffff",
    marginLeft: 8,
    opacity: 0.9,
  },
  tagline: {
    fontSize: 16,
    color: "rgba(255, 255, 255, 0.9)",
    marginBottom: 60,
    fontStyle: "italic",
    letterSpacing: 0.5,
  },
  loaderContainer: {
    marginTop: 30,
    height: 40,
    justifyContent: "center",
    alignItems: "center",
  },
  dotContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  dot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: "#ffffff",
  },
  dot1: {
    opacity: 0.3,
    marginBottom: 10,
  },
  dot2: {
    opacity: 0.6,
    marginBottom: 0,
  },
  dot3: {
    opacity: 0.3,
    marginBottom: 10,
  },
  appName: {
    fontSize: 40,
    color: "#ffffff",
    marginBottom: 80,
  },
  noConnectionText: {
    fontSize: 16,
    color: "#ffffff",
    lineHeight: 22,
  },
});
