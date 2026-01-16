import React, { useState, useEffect } from "react";
import {
  View,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Text as RNText,
  Linking,
  Platform,
  Dimensions,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useLanguage } from "../utils/LanguageContext";
import { useTheme } from "../utils/ThemeContext";

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

// Responsive layout hook
const useResponsiveLayout = () => {
  const [dimensions, setDimensions] = useState(Dimensions.get("window"));

  useEffect(() => {
    const subscription = Dimensions.addEventListener("change", ({ window }) => {
      setDimensions(window);
    });
    return () => subscription?.remove();
  }, []);

  const { width, height } = dimensions;
  const isLandscape = width > height;

  const isSmallPhone = width <= 375;
  const isMediumPhone = width > 375 && width <= 414;
  const isLargePhone = width > 414;

  const horizontalPadding = isSmallPhone ? 12 : isMediumPhone ? 16 : 20;

  return {
    width,
    height,
    isLandscape,
    isSmallPhone,
    isMediumPhone,
    isLargePhone,
    horizontalPadding,
  };
};

export default function HelpSupport() {
  const router = useRouter();
  const { t, isRTL } = useLanguage();
  const { theme } = useTheme();
  const layout = useResponsiveLayout();
  const [expandedIndex, setExpandedIndex] = useState(null);

  // Contact information
  const contactInfo = {
    whatsapp: "+9647501234567", // Replace with actual WhatsApp number
    email: "support@amanshop.com", // Replace with actual email
    phone: "+9647501234567", // Replace with actual phone number
  };

  // FAQ Questions
  const faqItems = [
    {
      question: t("howToPlaceOrder") || "How do I place an order?",
      answer:
        t("howToPlaceOrderAnswer") ||
        "To place an order, browse our products, add items to your cart, and proceed to checkout. You'll need to provide shipping details and payment information to complete your purchase.",
    },
    {
      question: t("paymentMethods") || "What payment methods do you accept?",
      answer:
        t("paymentMethodsAnswer") ||
        "We accept various payment methods including credit/debit cards, PayPal, and cash on delivery. All transactions are secure and encrypted.",
    },
    {
      question: t("shippingTime") || "How long does shipping take?",
      answer:
        t("shippingTimeAnswer") ||
        "Standard shipping typically takes 3-7 business days. Express shipping is available for faster delivery. You'll receive tracking information once your order ships.",
    },
    {
      question: t("trackOrder") || "How can I track my order?",
      answer:
        t("trackOrderAnswer") ||
        "You can track your order by going to the Orders section in your profile. Each order has a tracking number that you can use to monitor its status.",
    },
    {
      question: t("returnPolicy") || "What is your return policy?",
      answer:
        t("returnPolicyAnswer") ||
        "We offer a 30-day return policy for most items. Products must be unused and in original packaging. Contact support to initiate a return.",
    },
    {
      question: t("cancelOrder") || "Can I cancel my order?",
      answer:
        t("cancelOrderAnswer") ||
        "You can cancel your order within 24 hours of placing it. Go to your Orders page and select the order you wish to cancel. After 24 hours, cancellation may not be possible.",
    },
    {
      question: t("accountIssues") || "I'm having trouble with my account",
      answer:
        t("accountIssuesAnswer") ||
        "If you're experiencing account issues, try resetting your password. If problems persist, contact our support team with your account details.",
    },
    {
      question: t("walletBalance") || "How does the wallet work?",
      answer:
        t("walletBalanceAnswer") ||
        "Your wallet stores funds that you can use for purchases. You can add money to your wallet and earn bonuses through sales. Funds can be withdrawn to your bank account.",
    },
  ];

  const handleContactPress = async (type) => {
    try {
      let url = "";
      switch (type) {
        case "whatsapp":
          url = `whatsapp://send?phone=${contactInfo.whatsapp}`;
          break;
        case "email":
          url = `mailto:${contactInfo.email}`;
          break;
        case "phone":
          url = `tel:${contactInfo.phone}`;
          break;
      }

      const canOpen = await Linking.canOpenURL(url);
      if (canOpen) {
        await Linking.openURL(url);
      } else {
        console.log("Cannot open URL:", url);
      }
    } catch (error) {
      console.error("Error opening URL:", error);
    }
  };

  const toggleExpand = (index) => {
    setExpandedIndex(expandedIndex === index ? null : index);
  };

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
      <View
        style={[
          styles.header,
          {
            backgroundColor: theme.colors.card,
            direction: isRTL ? "rtl" : "ltr",
          },
        ]}
      >
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
          {t("helpSupport")}
        </Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView style={styles.scrollView}>
        {/* Contact Support Section */}
        <View
          style={[
            styles.section,
            { paddingHorizontal: layout.horizontalPadding },
          ]}
        >
          <Text
            style={[
              styles.sectionTitle,
              {
                color: theme.colors.text,
                fontSize: layout.isSmallPhone ? 18 : 20,
              },
            ]}
          >
            {t("contactSupport")}
          </Text>
          <Text
            style={[
              styles.sectionSubtitle,
              {
                color: theme.colors.textSecondary,
                fontSize: layout.isSmallPhone ? 13 : 14,
              },
            ]}
          >
            {t("contactSupportDesc") || "Get in touch with our support team"}
          </Text>

          {/* Contact Methods */}
          <View style={styles.contactContainer}>
            {/* WhatsApp */}
            <TouchableOpacity
              style={[
                styles.contactCard,
                {
                  backgroundColor: theme.colors.card,
                },
              ]}
              onPress={() => handleContactPress("whatsapp")}
            >
              <View
                style={[
                  styles.contactIcon,
                  {
                    backgroundColor: "#25D366" + "20",
                    width: layout.isSmallPhone ? 50 : 56,
                    height: layout.isSmallPhone ? 50 : 56,
                    borderRadius: layout.isSmallPhone ? 25 : 28,
                  },
                ]}
              >
                <Ionicons
                  name="logo-whatsapp"
                  size={layout.isSmallPhone ? 24 : 28}
                  color="#25D366"
                />
              </View>
              <View
                style={[
                  styles.contactInfo,
                  {
                    marginLeft: isRTL ? 0 : 12,
                    marginRight: isRTL ? 12 : 0,
                  },
                ]}
              >
                <Text
                  style={[
                    styles.contactTitle,
                    {
                      color: theme.colors.text,
                      fontSize: layout.isSmallPhone ? 15 : 16,
                    },
                  ]}
                >
                  WhatsApp
                </Text>
                <Text
                  style={[
                    styles.contactDetail,
                    {
                      color: theme.colors.textSecondary,
                      fontSize: layout.isSmallPhone ? 13 : 14,
                    },
                  ]}
                >
                  {contactInfo.whatsapp}
                </Text>
              </View>
              <Ionicons
                name={isRTL ? "chevron-back" : "chevron-forward"}
                size={20}
                color={theme.colors.textSecondary}
              />
            </TouchableOpacity>

            {/* Email */}
            <TouchableOpacity
              style={[
                styles.contactCard,
                {
                  backgroundColor: theme.colors.card,
                },
              ]}
              onPress={() => handleContactPress("email")}
            >
              <View
                style={[
                  styles.contactIcon,
                  {
                    backgroundColor: theme.colors.primary + "20",
                    width: layout.isSmallPhone ? 50 : 56,
                    height: layout.isSmallPhone ? 50 : 56,
                    borderRadius: layout.isSmallPhone ? 25 : 28,
                  },
                ]}
              >
                <Ionicons
                  name="mail"
                  size={layout.isSmallPhone ? 24 : 28}
                  color={theme.colors.primary}
                />
              </View>
              <View
                style={[
                  styles.contactInfo,
                  {
                    marginLeft: isRTL ? 0 : 12,
                    marginRight: isRTL ? 12 : 0,
                  },
                ]}
              >
                <Text
                  style={[
                    styles.contactTitle,
                    {
                      color: theme.colors.text,
                      fontSize: layout.isSmallPhone ? 15 : 16,
                    },
                  ]}
                >
                  {t("email")}
                </Text>
                <Text
                  style={[
                    styles.contactDetail,
                    {
                      color: theme.colors.textSecondary,
                      fontSize: layout.isSmallPhone ? 13 : 14,
                    },
                  ]}
                >
                  {contactInfo.email}
                </Text>
              </View>
              <Ionicons
                name={isRTL ? "chevron-back" : "chevron-forward"}
                size={20}
                color={theme.colors.textSecondary}
              />
            </TouchableOpacity>

            {/* Phone */}
            <TouchableOpacity
              style={[
                styles.contactCard,
                {
                  backgroundColor: theme.colors.card,
                },
              ]}
              onPress={() => handleContactPress("phone")}
            >
              <View
                style={[
                  styles.contactIcon,
                  {
                    backgroundColor: "#FF6B6B" + "20",
                    width: layout.isSmallPhone ? 50 : 56,
                    height: layout.isSmallPhone ? 50 : 56,
                    borderRadius: layout.isSmallPhone ? 25 : 28,
                  },
                ]}
              >
                <Ionicons
                  name="call"
                  size={layout.isSmallPhone ? 24 : 28}
                  color="#FF6B6B"
                />
              </View>
              <View
                style={[
                  styles.contactInfo,
                  {
                    marginLeft: isRTL ? 0 : 12,
                    marginRight: isRTL ? 12 : 0,
                  },
                ]}
              >
                <Text
                  style={[
                    styles.contactTitle,
                    {
                      color: theme.colors.text,
                      fontSize: layout.isSmallPhone ? 15 : 16,
                    },
                  ]}
                >
                  {t("phone")}
                </Text>
                <Text
                  style={[
                    styles.contactDetail,
                    {
                      color: theme.colors.textSecondary,
                      fontSize: layout.isSmallPhone ? 13 : 14,
                    },
                  ]}
                >
                  {contactInfo.phone}
                </Text>
              </View>
              <Ionicons
                name={isRTL ? "chevron-back" : "chevron-forward"}
                size={20}
                color={theme.colors.textSecondary}
              />
            </TouchableOpacity>
          </View>
        </View>

        {/* FAQ Section */}
        <View
          style={[
            styles.section,
            { paddingHorizontal: layout.horizontalPadding },
          ]}
        >
          <Text
            style={[
              styles.sectionTitle,
              {
                color: theme.colors.text,
                fontSize: layout.isSmallPhone ? 18 : 20,
              },
            ]}
          >
            {t("frequentlyAskedQuestions") || "Frequently Asked Questions"}
          </Text>
          <Text
            style={[
              styles.sectionSubtitle,
              {
                color: theme.colors.textSecondary,
                fontSize: layout.isSmallPhone ? 13 : 14,
              },
            ]}
          >
            {t("faqDesc") || "Find answers to common questions"}
          </Text>

          <View style={styles.faqContainer}>
            {faqItems.map((item, index) => (
              <View
                key={index}
                style={[
                  styles.faqItem,
                  {
                    backgroundColor: theme.colors.card,
                    borderBottomWidth: index < faqItems.length - 1 ? 1 : 0,
                    borderBottomColor: theme.colors.border,
                  },
                ]}
              >
                <TouchableOpacity
                  style={[
                    styles.faqQuestion,
                    {
                      paddingHorizontal: layout.isSmallPhone ? 12 : 16,
                      paddingVertical: layout.isSmallPhone ? 12 : 16,
                    },
                  ]}
                  onPress={() => toggleExpand(index)}
                >
                  <Text
                    style={[
                      styles.faqQuestionText,
                      {
                        color: theme.colors.text,

                        fontSize: layout.isSmallPhone ? 14 : 15,
                      },
                    ]}
                  >
                    {item.question}
                  </Text>
                  <Ionicons
                    name={
                      expandedIndex === index ? "chevron-up" : "chevron-down"
                    }
                    size={20}
                    color={theme.colors.textSecondary}
                    style={{
                      marginLeft: isRTL ? 0 : 8,
                      marginRight: isRTL ? 8 : 0,
                    }}
                  />
                </TouchableOpacity>
                {expandedIndex === index && (
                  <View
                    style={[
                      styles.faqAnswer,
                      {
                        paddingHorizontal: layout.isSmallPhone ? 12 : 16,
                        paddingBottom: layout.isSmallPhone ? 12 : 16,
                      },
                    ]}
                  >
                    <Text
                      style={[
                        styles.faqAnswerText,
                        {
                          color: theme.colors.textSecondary,

                          fontSize: layout.isSmallPhone ? 13 : 14,
                        },
                      ]}
                    >
                      {item.answer}
                    </Text>
                  </View>
                )}
              </View>
            ))}
          </View>
        </View>

        {/* Additional Info */}
        <View
          style={[
            styles.infoBox,
            {
              backgroundColor: theme.colors.card,
              marginHorizontal: layout.horizontalPadding,
              padding: layout.isSmallPhone ? 16 : 20,
            },
          ]}
        >
          <Ionicons
            name="time-outline"
            size={layout.isSmallPhone ? 20 : 24}
            color={theme.colors.primary}
            style={{ marginBottom: 8 }}
          />
          <Text
            style={[
              styles.infoTitle,
              {
                color: theme.colors.text,
                fontSize: layout.isSmallPhone ? 15 : 16,
                textAlign: "center",
              },
            ]}
          >
            {t("supportHours") || "Support Hours"}
          </Text>
          <Text
            style={[
              styles.infoText,
              {
                color: theme.colors.textSecondary,
                fontSize: layout.isSmallPhone ? 13 : 14,
                textAlign: "center",
              },
            ]}
          >
            {t("supportHoursDesc") ||
              "Our support team is available 24/7 to assist you"}
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
    marginTop: 24,
  },
  sectionTitle: {
    marginBottom: 8,
  },
  sectionSubtitle: {
    marginBottom: 16,
    lineHeight: 20,
  },
  contactContainer: {
    gap: 12,
  },
  contactCard: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
    gap: 12,
    borderRadius: 12,
  },
  contactIcon: {
    justifyContent: "center",
    alignItems: "center",
  },
  contactInfo: {
    flex: 1,
  },
  contactTitle: {
    marginBottom: 4,
  },
  contactDetail: {},
  faqContainer: {
    borderRadius: 12,
    overflow: "hidden",
  },
  faqItem: {
    overflow: "hidden",
  },
  faqQuestion: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  faqQuestionText: {
    flex: 1,

    lineHeight: 22,
  },
  faqAnswer: {},
  faqAnswerText: {
    lineHeight: 22,
  },
  infoBox: {
    borderRadius: 12,
    alignItems: "center",
    marginBottom: 32,
    marginTop: 8,
  },
  infoTitle: {
    marginBottom: 8,
  },
  infoText: {
    lineHeight: 20,
  },
});
