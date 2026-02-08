import React from "react";
import { View, StyleSheet, ScrollView, Image, Linking, TouchableOpacity, Dimensions } from "react-native";
import appIcon from "../assets/images/aman-app.png";
import { SafeAreaView } from "react-native-safe-area-context";
import { useTheme } from "../utils/ThemeContext";
import { useLanguage } from "../utils/LanguageContext";
import { Text } from "../components/ui/Text";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";

const { width } = Dimensions.get("window");

export default function About() {
  const { theme } = useTheme();
  const { t, isRTL } = useLanguage();
  const router = useRouter();

  const openEmail = () => {
    Linking.openURL("mailto:support@aman-store.com");
  };

  const openPhone = () => {
    Linking.openURL("tel:+9647501234567");
  };

  const openWebsite = () => {
    Linking.openURL("https://aman-store.com");
  };

  const stats = [
    { icon: "people", value: "50K+", label: t("customers") || "Customers" },
    { icon: "cube", value: "10K+", label: t("products") || "Products" },
    { icon: "star", value: "4.8", label: t("rating") || "Rating" },
    { icon: "checkmark-done", value: "99%", label: t("satisfaction") || "Satisfaction" },
  ];

  const features = [
    { 
      icon: "cart-outline", 
      title: t("easyShopping") || "Easy Shopping",
      description: t("easyShoppingDesc") || "Browse and shop with ease"
    },
    { 
      icon: "shield-checkmark-outline", 
      title: t("securePayments") || "Secure Payments",
      description: t("securePaymentsDesc") || "Your transactions are protected"
    },
    { 
      icon: "rocket-outline", 
      title: t("fastDelivery") || "Fast Delivery",
      description: t("fastDeliveryDesc") || "Quick and reliable shipping"
    },
    { 
      icon: "heart-outline", 
      title: t("qualityProducts") || "Quality Products",
      description: t("qualityProductsDesc") || "Only the best for you"
    },
    { 
      icon: "cash-outline", 
      title: t("earnRewards") || "Earn Rewards",
      description: t("earnRewardsDesc") || "Get bonuses on every purchase"
    },
    { 
      icon: "headset-outline", 
      title: t("support247") || "24/7 Support",
      description: t("support247Desc") || "We're always here to help"
    },
  ];

  const values = [
    {
      icon: "shield-checkmark",
      title: t("trustworthy") || "Trustworthy",
      description: t("trustworthyDesc") || "Building trust through transparency and reliability",
      color: "#4CAF50",
    },
    {
      icon: "people",
      title: t("customerFirst") || "Customer First",
      description: t("customerFirstDesc") || "Your satisfaction is our top priority",
      color: "#2196F3",
    },
    {
      icon: "trending-up",
      title: t("innovation") || "Innovation",
      description: t("innovationDesc") || "Constantly improving your shopping experience",
      color: "#FF9800",
    },
  ];

  const socialLinks = [
    { icon: "logo-facebook", color: "#1877F2", url: "https://facebook.com" },
    { icon: "logo-instagram", color: "#E4405F", url: "https://instagram.com" },
    { icon: "logo-twitter", color: "#1DA1F2", url: "https://twitter.com" },
    { icon: "logo-whatsapp", color: "#25D366", url: "https://wa.me/9647501234567" },
  ];

  return (
    <SafeAreaView
      style={[
        styles.container,
        {
          backgroundColor: theme.colors.background,
        },
      ]}
      edges={['top']}
    >
      {/* Header */}
      <View style={[styles.header, { backgroundColor: theme.colors.card }]}>
        <TouchableOpacity
          onPress={() => router.canGoBack() ? router.back() : router.replace("/(tabs)/profile")}
          style={styles.backButton}
        >
          <Ionicons
            name={isRTL ? "arrow-forward" : "arrow-back"}
            size={24}
            color={theme.colors.text}
          />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: theme.colors.text }]}>
          {t("about") || "About"}
        </Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView 
        style={styles.scrollView}
        contentContainerStyle={styles.contentContainer}
        showsVerticalScrollIndicator={false}
      >
        {/* Hero Section with Gradient */}
        <LinearGradient
          colors={[theme.colors.primary, theme.colors.primary + 'dd']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.heroSection}
        >
          <View style={styles.logoWrapper}>
            <View style={styles.logoContainer}>
              <Image
                source={appIcon}
                style={styles.logo}
                accessibilityLabel={t("aboutApp")}
                resizeMode="contain"
              />
            </View>
            <View style={styles.logoPulse} />
          </View>
          <Text style={styles.appName}>Aman Store</Text>
          <Text style={styles.tagline}>
            {t("appTagline") || "Your Trusted Shopping Partner"}
          </Text>
          <View style={styles.versionContainer}>
            <View style={styles.versionBadge}>
              <Ionicons name="code-slash" size={14} color="#fff" />
              <Text style={styles.versionText}>Version 1.0.0</Text>
            </View>
          </View>
        </LinearGradient>

        {/* Stats Section */}
        <View style={styles.statsSection}>
          {stats.map((stat, index) => (
            <View key={index} style={styles.statCard}>
              <View style={[styles.statIconContainer, { backgroundColor: theme.colors.primary + '15' }]}>
                <Ionicons name={stat.icon} size={24} color={theme.colors.primary} />
              </View>
              <Text style={[styles.statValue, { color: theme.colors.text }]}>
                {stat.value}
              </Text>
              <Text style={[styles.statLabel, { color: theme.colors.textSecondary }]}>
                {stat.label}
              </Text>
            </View>
          ))}
        </View>

        {/* About Section */}
        <View style={styles.sectionContainer}>
          <View style={[styles.sectionCard, { backgroundColor: theme.colors.card }]}>
            <View style={styles.sectionHeaderRow}>
              <View style={[styles.iconBadge, { backgroundColor: theme.colors.primary + '15' }]}>
                <Ionicons name="information-circle" size={28} color={theme.colors.primary} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>
                  {t("aboutApp") || "About Aman"}
                </Text>
                <Text style={[styles.sectionSubtitle, { color: theme.colors.textSecondary }]}>
                  {t("whoWeAre") || "Who we are"}
                </Text>
              </View>
            </View>
            <Text style={[styles.sectionText, { color: theme.colors.textSecondary }]}>
              {t("aboutAppText") || "Aman Store is your one-stop destination for quality products at great prices. We connect you with trusted sellers and ensure a seamless shopping experience from browsing to delivery."}
            </Text>
          </View>
        </View>

        {/* Features Grid */}
        <View style={styles.sectionContainer}>
          <Text style={[styles.mainTitle, { color: theme.colors.text }]}>
            {t("whyChooseUs") || "Why Choose Us?"}
          </Text>
          <View style={styles.featuresGrid}>
            {features.map((feature, index) => (
              <View 
                key={index}
                style={[styles.featureCard, { backgroundColor: theme.colors.card }]}
              >
                <View style={[styles.featureIcon, { backgroundColor: theme.colors.primary + '15' }]}>
                  <Ionicons name={feature.icon} size={26} color={theme.colors.primary} />
                </View>
                <Text style={[styles.featureTitle, { color: theme.colors.text }]}>
                  {feature.title}
                </Text>
                <Text style={[styles.featureDescription, { color: theme.colors.textSecondary }]}>
                  {feature.description}
                </Text>
              </View>
            ))}
          </View>
        </View>

        {/* Values Section */}
        <View style={styles.sectionContainer}>
          <Text style={[styles.mainTitle, { color: theme.colors.text }]}>
            {t("ourValues") || "Our Values"}
          </Text>
          {values.map((value, index) => (
            <View 
              key={index}
              style={[styles.valueCard, { backgroundColor: theme.colors.card }]}
            >
              <View style={[styles.valueIconContainer, { backgroundColor: value.color + '15' }]}>
                <Ionicons name={value.icon} size={32} color={value.color} />
              </View>
              <View style={styles.valueContent}>
                <Text style={[styles.valueTitle, { color: theme.colors.text }]}>
                  {value.title}
                </Text>
                <Text style={[styles.valueDescription, { color: theme.colors.textSecondary }]}>
                  {value.description}
                </Text>
              </View>
            </View>
          ))}
        </View>

        {/* Contact Section */}
        <View style={styles.sectionContainer}>
          <View style={[styles.contactCard, { backgroundColor: theme.colors.card }]}>
            <View style={[styles.contactHeader, { backgroundColor: theme.colors.primary + '10' }]}>
              <Ionicons name="mail" size={32} color={theme.colors.primary} />
              <Text style={[styles.contactTitle, { color: theme.colors.text }]}>
                {t("getInTouch") || "Get In Touch"}
              </Text>
              <Text style={[styles.contactSubtitle, { color: theme.colors.textSecondary }]}>
                {t("contactUsText") || "We'd love to hear from you"}
              </Text>
            </View>

            <View style={styles.contactButtons}>
              <TouchableOpacity
                style={[styles.contactButton, { backgroundColor: theme.colors.primary }]}
                onPress={openEmail}
                activeOpacity={0.8}
              >
                <Ionicons name="mail-outline" size={22} color="#fff" />
                <Text style={styles.contactButtonText}>
                  {t("emailUs") || "Email Us"}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.contactButton, { backgroundColor: "#25D366" }]}
                onPress={openPhone}
                activeOpacity={0.8}
              >
                <Ionicons name="logo-whatsapp" size={22} color="#fff" />
                <Text style={styles.contactButtonText}>
                  {t("whatsapp") || "WhatsApp"}
                </Text>
              </TouchableOpacity>
            </View>

            <TouchableOpacity
              style={[styles.websiteButton, { backgroundColor: theme.colors.background }]}
              onPress={openWebsite}
              activeOpacity={0.8}
            >
              <Ionicons name="globe-outline" size={20} color={theme.colors.primary} />
              <Text style={[styles.websiteButtonText, { color: theme.colors.primary }]}>
                {t("visitWebsite") || "Visit Website"}
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Social Links */}
        <View style={styles.sectionContainer}>
          <Text style={[styles.mainTitle, { color: theme.colors.text }]}>
            {t("followUs") || "Follow Us"}
          </Text>
          <View style={styles.socialContainer}>
            {socialLinks.map((social, index) => (
              <TouchableOpacity
                key={index}
                style={[styles.socialButton, { backgroundColor: social.color + '15' }]}
                onPress={() => Linking.openURL(social.url)}
                activeOpacity={0.7}
              >
                <Ionicons name={social.icon} size={28} color={social.color} />
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Footer */}
        <View style={styles.footer}>
          <View style={[styles.footerDivider, { backgroundColor: theme.colors.border }]} />
          <Text style={[styles.footerText, { color: theme.colors.textSecondary }]}>
            {t("madeWithLove") || "Made with ❤️ in Kurdistan"}
          </Text>
          <Text style={[styles.copyright, { color: theme.colors.textSecondary }]}>
            © {new Date().getFullYear()} Aman Store. {t("allRightsReserved") || "All rights reserved."}
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
  },
  backButton: {
    width: 40,
    height: 40,
    justifyContent: "center",
    alignItems: "center",
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "600",
    flex: 1,
    textAlign: "center",
  },
  scrollView: {
    flex: 1,
  },
  contentContainer: {
    paddingBottom: 40,
  },
  
  // Hero Section
  heroSection: {
    paddingTop: 50,
    paddingBottom: 50,
    paddingHorizontal: 20,
    alignItems: "center",
    overflow: "hidden",
  },
  logoWrapper: {
    position: "relative",
    marginBottom: 24,
  },
  logoContainer: {
    width: 110,
    height: 110,
    borderRadius: 28,
    backgroundColor: "#fff",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 2,
  },
  logoPulse: {
    position: "absolute",
    width: 110,
    height: 110,
    borderRadius: 28,
    backgroundColor: "rgba(255,255,255,0.3)",
    top: 0,
    left: 0,
  },
  logo: {
    width: 80,
    height: 80,
    borderRadius: 20,
  },
  appName: {
    fontSize: 36,
    fontWeight: "bold",
    color: "#fff",
    letterSpacing: 1.5,
    marginBottom: 8,
  },
  tagline: {
    fontSize: 16,
    color: "rgba(255,255,255,0.95)",
    textAlign: "center",
    marginBottom: 20,
    paddingHorizontal: 20,
  },
  versionContainer: {
    marginTop: 8,
  },
  versionBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.25)",
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    gap: 6,
  },
  versionText: {
    color: "#fff",
    fontSize: 13,
    fontWeight: "600",
  },

  // Stats Section
  statsSection: {
    flexDirection: "row",
    flexWrap: "wrap",
    paddingHorizontal: 20,
    paddingVertical: 30,
    gap: 12,
  },
  statCard: {
    width: (width - 52) / 2,
    alignItems: "center",
    paddingVertical: 20,
  },
  statIconContainer: {
    width: 56,
    height: 56,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 12,
  },
  statValue: {
    fontSize: 28,
    fontWeight: "bold",
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 13,
    textAlign: "center",
  },

  // Section Container
  sectionContainer: {
    paddingHorizontal: 20,
    marginBottom: 24,
  },
  mainTitle: {
    fontSize: 24,
    fontWeight: "bold",
    marginBottom: 20,
    textAlign: "center",
  },

  // Section Card
  sectionCard: {
    borderRadius: 20,
    padding: 24,
  },
  sectionHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 16,
    gap: 16,
  },
  iconBadge: {
    width: 60,
    height: 60,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
  },
  sectionTitle: {
    fontSize: 22,
    fontWeight: "bold",
    marginBottom: 4,
  },
  sectionSubtitle: {
    fontSize: 14,
  },
  sectionText: {
    fontSize: 15,
    lineHeight: 24,
  },

  // Features Grid
  featuresGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
  },
  featureCard: {
    width: (width - 52) / 2,
    borderRadius: 20,
    padding: 20,
    alignItems: "center",
  },
  featureIcon: {
    width: 60,
    height: 60,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 14,
  },
  featureTitle: {
    fontSize: 15,
    fontWeight: "600",
    textAlign: "center",
    marginBottom: 6,
  },
  featureDescription: {
    fontSize: 12,
    textAlign: "center",
    lineHeight: 18,
  },

  // Values Section
  valueCard: {
    borderRadius: 20,
    padding: 20,
    marginBottom: 16,
    flexDirection: "row",
    alignItems: "center",
    gap: 16,
  },
  valueIconContainer: {
    width: 70,
    height: 70,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  valueContent: {
    flex: 1,
  },
  valueTitle: {
    fontSize: 18,
    fontWeight: "bold",
    marginBottom: 6,
  },
  valueDescription: {
    fontSize: 14,
    lineHeight: 22,
  },

  // Contact Section
  contactCard: {
    borderRadius: 24,
    overflow: "hidden",
  },
  contactHeader: {
    alignItems: "center",
    paddingVertical: 40,
    paddingHorizontal: 20,
  },
  contactTitle: {
    fontSize: 24,
    fontWeight: "bold",
    marginTop: 16,
    marginBottom: 8,
  },
  contactSubtitle: {
    fontSize: 15,
    textAlign: "center",
  },
  contactButtons: {
    flexDirection: "row",
    gap: 12,
    padding: 20,
  },
  contactButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 16,
    borderRadius: 16,
    gap: 8,
  },
  contactButtonText: {
    color: "#fff",
    fontSize: 15,
    fontWeight: "600",
  },
  websiteButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 16,
    marginHorizontal: 20,
    marginBottom: 20,
    borderRadius: 16,
    gap: 8,
  },
  websiteButtonText: {
    fontSize: 15,
    fontWeight: "600",
  },

  // Social Section
  socialContainer: {
    flexDirection: "row",
    justifyContent: "center",
    gap: 16,
  },
  socialButton: {
    width: 60,
    height: 60,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
  },

  // Footer
  footer: {
    alignItems: "center",
    paddingHorizontal: 20,
    paddingTop: 30,
    paddingBottom: 20,
  },
  footerDivider: {
    width: 80,
    height: 4,
    borderRadius: 2,
    marginBottom: 24,
  },
  footerText: {
    fontSize: 15,
    marginBottom: 8,
    textAlign: "center",
  },
  copyright: {
    fontSize: 13,
    textAlign: "center",
  },
});
