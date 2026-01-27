import React from "react";
import {
  View,
  StyleSheet,
  Dimensions,
  Text,
  ActivityIndicator,
} from "react-native";

const { width, height } = Dimensions.get("window");

export default function AppLoader() {
  return (
    <View style={styles.container}>
      <View style={styles.gradient}>
        <View style={styles.logoContainer}>
          {/* Outer circle */}
          <View style={styles.outerCircle}>
            {/* Inner circle */}
            <View style={styles.innerCircle}>
              {/* Logo/Icon placeholder */}
              <View style={styles.logoIcon}>
                <Text style={styles.logoText}>A</Text>
              </View>
            </View>
          </View>
        </View>

        <View style={styles.textContainer}>
          <Text style={styles.appName}>Aman</Text>
          <Text style={styles.tagline}>Loading your experience...</Text>
        </View>

        {/* Loading indicator */}
        <View style={styles.loaderContainer}>
          <ActivityIndicator size="large" color="#ffffff" />
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    width: width,
    height: height,
  },
  gradient: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#3b5998",
  },
  logoContainer: {
    marginBottom: 40,
  },
  outerCircle: {
    width: 160,
    height: 160,
    borderRadius: 80,
    backgroundColor: "rgba(255, 255, 255, 0.1)",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 2,
    borderColor: "rgba(255, 255, 255, 0.3)",
  },
  innerCircle: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: "rgba(255, 255, 255, 0.2)",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 2,
    borderColor: "rgba(255, 255, 255, 0.4)",
  },
  logoIcon: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: "#ffffff",
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  logoText: {
    fontSize: 48,

    color: "#3b5998",
  },
  textContainer: {
    alignItems: "center",
    marginTop: 20,
  },
  appName: {
    fontSize: 42,

    color: "#ffffff",
    marginBottom: 8,
    letterSpacing: 2,
  },
  tagline: {
    fontSize: 16,
    color: "rgba(255, 255, 255, 0.8)",
  },
  loaderContainer: {
    position: "absolute",
    bottom: 80,
  },
});
