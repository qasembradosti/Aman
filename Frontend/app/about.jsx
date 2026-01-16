import React from "react";
import { View, StyleSheet, ScrollView, Image, Linking, TouchableOpacity } from "react-native";
import appIcon from "../assets/images/aman-app.png";
import { SafeAreaView } from "react-native-safe-area-context";
import { useTheme } from "../utils/ThemeContext";
import { useLanguage } from "../utils/LanguageContext";
import { Text } from "../components/ui/Text";
import { Ionicons } from "@expo/vector-icons";

export default function About() {
  const { theme } = useTheme();
  const { t, isRTL } = useLanguage();

  const openEmail = () => {
    Linking.openURL("mailto:support@example.com");
  };

  const openPhone = () => {
    Linking.openURL("tel:+1234567890");
  };

  const features = [
    { icon: "cart-outline", label: "Easy Shopping" },
    { icon: "shield-checkmark-outline", label: "Secure Payments" },
    { icon: "rocket-outline", label: "Fast Delivery" },
    { icon: "heart-outline", label: "Quality Products" },
  ];

  const socialLinks = [
    { icon: "logo-facebook", color: "#1877F2" },
    { icon: "logo-instagram", color: "#E4405F" },
    { icon: "logo-twitter", color: "#1DA1F2" },
    { icon: "logo-whatsapp", color: "#25D366" },
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
      <ScrollView 
        contentContainerStyle={styles.contentContainer}
        showsVerticalScrollIndicator={false}
      >
        {/* Hero Section */}
        <View
          style={[styles.heroGradient, { backgroundColor: theme.colors.primary }]}
        >
          <View style={styles.heroContent}>
            <View style={styles.logoContainer}>
              <Image
                source={appIcon}
                style={styles.logo}
                accessibilityLabel={t("aboutApp")}
                resizeMode="contain"
              />
            </View>
            <Text style={styles.appName}>Aman</Text>
            <Text style={styles.tagline}>Your Trusted Shopping Partner</Text>
            <View style={styles.versionBadge}>
              <Text style={styles.versionBadgeText}>v1.0.0</Text>
            </View>
          </View>
        </View>

        {/* Features Grid */}
        <View style={styles.featuresSection}>
          <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>
            Why Choose Us?
          </Text>
          <View style={styles.featuresGrid}>
            {features.map((feature, index) => (
              <View
                key={index}
                style={[
                  styles.featureCard,
                  {
                    backgroundColor: theme.colors.card,
                    borderColor: theme.colors.border,
                  },
                ]}
              >
                <View
                  style={[
                    styles.featureIconContainer,
                    { backgroundColor: theme.colors.primary + "15" },
                  ]}
                >
                  <Ionicons
                    name={feature.icon}
                    size={24}
                    color={theme.colors.primary}
                  />
                </View>
                <Text
                  style={[styles.featureLabel, { color: theme.colors.text }]}
                >
                  {feature.label}
                </Text>
              </View>
            ))}
          </View>
        </View>

        {/* About Section */}
        <View
          style={[
            styles.section,
            {
              backgroundColor: theme.colors.card,
              borderColor: theme.colors.border,
            },
          ]}
        >
          <View style={styles.sectionHeader}>
            <View
              style={[
                styles.sectionIconContainer,
                { backgroundColor: theme.colors.primary + "15" },
              ]}
            >
              <Ionicons
                name="information-circle-outline"
                size={24}
                color={theme.colors.primary}
              />
            </View>
            <Text style={[styles.sectionHeaderTitle, { color: theme.colors.text }]}>
              {t("aboutApp")}
            </Text>
          </View>
          <Text
            style={[styles.paragraph, { color: theme.colors.textSecondary }]}
          >
            {t("aboutAppText")}
          </Text>
        </View>

        {/* Mission Section */}
        <View
          style={[
            styles.section,
            {
              backgroundColor: theme.colors.card,
              borderColor: theme.colors.border,
            },
          ]}
        >
          <View style={styles.sectionHeader}>
            <View
              style={[
                styles.sectionIconContainer,
                { backgroundColor: theme.colors.primary + "15" },
              ]}
            >
              <Ionicons
                name="flag-outline"
                size={24}
                color={theme.colors.primary}
              />
            </View>
            <Text style={[styles.sectionHeaderTitle, { color: theme.colors.text }]}>
              {t("ourMission")}
            </Text>
          </View>
          <Text
            style={[styles.paragraph, { color: theme.colors.textSecondary }]}
          >
            {t("ourMissionText")}
          </Text>
        </View>

        {/* Contact Section */}
        <View
          style={[
            styles.section,
            {
              backgroundColor: theme.colors.card,
              borderColor: theme.colors.border,
            },
          ]}
        >
          <View style={styles.sectionHeader}>
            <View
              style={[
                styles.sectionIconContainer,
                { backgroundColor: theme.colors.primary + "15" },
              ]}
            >
              <Ionicons
                name="mail-outline"
                size={24}
                color={theme.colors.primary}
              />
            </View>
            <Text style={[styles.sectionHeaderTitle, { color: theme.colors.text }]}>
              {t("contactUs")}
            </Text>
          </View>
          <Text
            style={[styles.paragraph, { color: theme.colors.textSecondary, marginBottom: 16 }]}
          >
            {t("contactUsText")}
          </Text>
          
          {/* Contact Buttons */}
          <View style={styles.contactButtons}>
            <TouchableOpacity
              style={[styles.contactButton, { backgroundColor: theme.colors.primary }]}
              onPress={openEmail}
            >
              <Ionicons name="mail" size={20} color="#fff" />
              <Text style={styles.contactButtonText}>Email Us</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.contactButton, { backgroundColor: "#25D366" }]}
              onPress={openPhone}
            >
              <Ionicons name="call" size={20} color="#fff" />
              <Text style={styles.contactButtonText}>Call Us</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Social Links */}
        <View style={styles.socialSection}>
          <Text style={[styles.socialTitle, { color: theme.colors.text }]}>
            Follow Us
          </Text>
          <View style={styles.socialLinks}>
            {socialLinks.map((social, index) => (
              <TouchableOpacity
                key={index}
                style={[
                  styles.socialButton,
                  { backgroundColor: social.color + "15" },
                ]}
              >
                <Ionicons name={social.icon} size={24} color={social.color} />
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Footer */}
        <View style={styles.footer}>
          <View style={styles.footerDivider} />
          <Text style={[styles.footerText, { color: theme.colors.textSecondary }]}>
            Made with ❤️ for our customers
          </Text>
          <Text style={[styles.copyright, { color: theme.colors.textSecondary }]}>
            © 2024 Aman. All rights reserved.
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
  contentContainer: {
    paddingBottom: 40,
  },
  heroGradient: {
    paddingVertical: 40,
    paddingHorizontal: 20,
    borderBottomLeftRadius: 30,
    borderBottomRightRadius: 30,
  },
  heroContent: {
    alignItems: "center",
  },
  logoContainer: {
    width: 100,
    height: 100,
    borderRadius: 25,
    backgroundColor: "#fff",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 8,
    marginBottom: 16,
  },
  logo: {
    width: 70,
    height: 70,
    borderRadius: 16,
  },
  appName: {
    fontSize: 32,
    
    color: "#fff",
    letterSpacing: 1,
  },
  tagline: {
    fontSize: 14,
    color: "rgba(255,255,255,0.9)",
    marginTop: 8,
  },
  versionBadge: {
    marginTop: 16,
    backgroundColor: "rgba(255,255,255,0.2)",
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 20,
  },
  versionBadgeText: {
    color: "#fff",
    fontSize: 12,
    
  },
  featuresSection: {
    padding: 20,
  },
  sectionTitle: {
    fontSize: 20,
    
    marginBottom: 16,
    textAlign: "center",
  },
  featuresGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    gap: 12,
  },
  featureCard: {
    width: "48%",
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  featureIconContainer: {
    width: 50,
    height: 50,
    borderRadius: 25,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 12,
  },
  featureLabel: {
    fontSize: 13,
    
    textAlign: "center",
  },
  section: {
    marginHorizontal: 20,
    marginBottom: 16,
    padding: 20,
    borderRadius: 20,
    borderWidth: 1,
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 3,
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 16,
  },
  sectionIconContainer: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  sectionHeaderTitle: {
    fontSize: 18,
    
  },
  paragraph: {
    fontSize: 15,
    lineHeight: 24,
  },
  contactButtons: {
    flexDirection: "row",
    gap: 12,
  },
  contactButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 12,
    borderRadius: 12,
    gap: 8,
  },
  contactButtonText: {
    color: "#fff",
    fontSize: 14,
    
  },
  socialSection: {
    alignItems: "center",
    paddingVertical: 24,
  },
  socialTitle: {
    fontSize: 16,
    
    marginBottom: 16,
  },
  socialLinks: {
    flexDirection: "row",
    gap: 16,
  },
  socialButton: {
    width: 50,
    height: 50,
    borderRadius: 25,
    alignItems: "center",
    justifyContent: "center",
  },
  footer: {
    alignItems: "center",
    paddingHorizontal: 20,
    paddingTop: 10,
  },
  footerDivider: {
    width: 60,
    height: 4,
    backgroundColor: "#ddd",
    borderRadius: 2,
    marginBottom: 20,
  },
  footerText: {
    fontSize: 14,
    marginBottom: 8,
  },
  copyright: {
    fontSize: 12,
  },
});
