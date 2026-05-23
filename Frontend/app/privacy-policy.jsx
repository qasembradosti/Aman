import React, { useEffect, useState } from "react";
import {
  View,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Linking,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";
import { useTheme } from "../utils/ThemeContext";
import { useLanguage } from "../utils/LanguageContext";
import { Text } from "../components/ui/Text";
import { getAboutScreenContent } from "../services/contentService";
import { getLegalContent } from "../constants/legalContent";

export default function PrivacyPolicyScreen() {
  const router = useRouter();
  const { theme } = useTheme();
  const { locale, isRTL } = useLanguage();
  const [aboutContent, setAboutContent] = useState(null);

  const legalContent = getLegalContent(locale);

  useEffect(() => {
    let mounted = true;

    const loadAboutContent = async () => {
      try {
        const data = await getAboutScreenContent();
        if (mounted && data?.about) {
          setAboutContent(data.about);
        }
      } catch (error) {
        console.error("Failed to load legal contact info:", error?.message || error);
      }
    };

    loadAboutContent();

    return () => {
      mounted = false;
    };
  }, []);

  const contactInfo = {
    email: aboutContent?.support_email || "support@aman-store.com",
    phone: aboutContent?.support_phone || "+9647501234567",
    website: aboutContent?.website_url
      ? /^https?:\/\//i.test(aboutContent.website_url)
        ? aboutContent.website_url
        : `https://${aboutContent.website_url}`
      : "https://aman-store.com",
  };

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: theme.colors.background }]}
      edges={["top"]}
    >
      <View
        style={[
          styles.header,
          { backgroundColor: theme.colors.card, flexDirection: isRTL ? "row-reverse" : "row" },
        ]}
      >
        <TouchableOpacity
          onPress={() =>
            router.canGoBack() ? router.back() : router.replace("/(tabs)/profile")
          }
          style={styles.backButton}
        >
          <Ionicons
            name={isRTL ? "arrow-forward" : "arrow-back"}
            size={24}
            color={theme.colors.text}
          />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: theme.colors.text }]}>
          {legalContent.screenTitle}
        </Text>
        <View style={styles.backButton} />
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.contentContainer}
        showsVerticalScrollIndicator={false}
      >
        <LinearGradient
          colors={[theme.colors.primary, theme.colors.primary + "DB"]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.heroCard}
        >
          <View style={styles.heroBadge}>
            <Ionicons name="shield-checkmark-outline" size={18} color="#fff" />
            <Text style={styles.heroBadgeText}>{legalContent.updatedLabel}</Text>
          </View>
          <Text style={styles.heroTitle}>{legalContent.introTitle}</Text>
          <Text style={styles.heroBody}>{legalContent.introBody}</Text>
        </LinearGradient>

        {legalContent.sections.map((section) => (
          <View
            key={section.title}
            style={[styles.sectionCard, { backgroundColor: theme.colors.card }]}
          >
            <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>
              {section.title}
            </Text>
            <View style={styles.pointsList}>
              {section.points.map((point) => (
                <View
                  key={point}
                  style={[
                    styles.pointRow,
                    { flexDirection: isRTL ? "row-reverse" : "row" },
                  ]}
                >
                  <View
                    style={[
                      styles.pointDot,
                      { backgroundColor: theme.colors.primary },
                    ]}
                  />
                  <Text
                    style={[
                      styles.pointText,
                      {
                        color: theme.colors.textSecondary,
                        textAlign: isRTL ? "right" : "left",
                      },
                    ]}
                  >
                    {point}
                  </Text>
                </View>
              ))}
            </View>
          </View>
        ))}

        <View
          style={[styles.contactCard, { backgroundColor: theme.colors.card }]}
        >
          <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>
            {legalContent.contactTitle}
          </Text>
          <Text
            style={[styles.contactIntro, { color: theme.colors.textSecondary }]}
          >
            {legalContent.contactIntro}
          </Text>

          <TouchableOpacity
            style={[styles.contactButton, { backgroundColor: theme.colors.primary + "12" }]}
            onPress={() => Linking.openURL(`mailto:${contactInfo.email}`)}
          >
            <Ionicons name="mail-outline" size={20} color={theme.colors.primary} />
            <Text style={[styles.contactText, { color: theme.colors.text }]}>
              {contactInfo.email}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.contactButton, { backgroundColor: theme.colors.primary + "12" }]}
            onPress={() => Linking.openURL(`tel:${contactInfo.phone}`)}
          >
            <Ionicons name="call-outline" size={20} color={theme.colors.primary} />
            <Text style={[styles.contactText, { color: theme.colors.text }]}>
              {contactInfo.phone}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.contactButton, { backgroundColor: theme.colors.primary + "12" }]}
            onPress={() => Linking.openURL(contactInfo.website)}
          >
            <Ionicons name="globe-outline" size={20} color={theme.colors.primary} />
            <Text style={[styles.contactText, { color: theme.colors.text }]}>
              {contactInfo.website}
            </Text>
          </TouchableOpacity>
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
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  backButton: {
    width: 40,
    height: 40,
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitle: {
    flex: 1,
    fontSize: 18,
    textAlign: "center",
  },
  scrollView: {
    flex: 1,
  },
  contentContainer: {
    padding: 16,
    gap: 16,
  },
  heroCard: {
    borderRadius: 24,
    padding: 22,
    gap: 12,
  },
  heroBadge: {
    alignSelf: "flex-start",
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "rgba(255,255,255,0.18)",
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 7,
  },
  heroBadgeText: {
    color: "#fff",
    fontSize: 12,
  },
  heroTitle: {
    color: "#fff",
    fontSize: 24,
    lineHeight: 31,
  },
  heroBody: {
    color: "rgba(255,255,255,0.95)",
    fontSize: 14,
    lineHeight: 22,
  },
  sectionCard: {
    borderRadius: 20,
    padding: 18,
    gap: 14,
  },
  sectionTitle: {
    fontSize: 18,
  },
  pointsList: {
    gap: 12,
  },
  pointRow: {
    alignItems: "flex-start",
    gap: 10,
  },
  pointDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginTop: 8,
  },
  pointText: {
    flex: 1,
    fontSize: 14,
    lineHeight: 22,
  },
  contactCard: {
    borderRadius: 20,
    padding: 18,
    gap: 12,
    marginBottom: 20,
  },
  contactIntro: {
    fontSize: 14,
    lineHeight: 22,
  },
  contactButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingHorizontal: 14,
    paddingVertical: 14,
    borderRadius: 14,
  },
  contactText: {
    flex: 1,
    fontSize: 14,
  },
});
