import React from "react";
import {
  View,
  StyleSheet,
  ImageBackground,
  TouchableOpacity,
} from "react-native";
import { useRouter } from "expo-router";
import { Text } from "./ui/Text";
import { useLanguage } from "../utils/LanguageContext";

// Map of section types to banner filenames (without locale suffix)
const BANNER_MAP = {
  categories: "categoris", // Note: typo in filename
  brands: "brands",
  additions: "additions", // For recently added products
  discounts: "discounts",
  popular: "populer", // Note: typo in filename
  special: "special",
};

export default function SectionBanner({
  type,
  style,
  children,
  resizeMode = "cover",
  route,
}) {
  const { locale, isRTL, t } = useLanguage();
  const router = useRouter();

  // Get the banner filename based on type and locale
  const getBannerSource = () => {
    const baseName = BANNER_MAP[type];
    if (!baseName) return null;

    // Handle the Kurdish typo for additions
    const filename =
      type === "additions" && locale === "ku"
        ? "addition_ku"
        : `${baseName}_${locale}`;

    try {
      // Dynamically require the banner image
      switch (filename) {
        case "categoris_en":
          return require("../assets/banners/categoris_en.jpg");
        case "categoris_ar":
          return require("../assets/banners/categoris_ar.jpg");
        case "categoris_ku":
          return require("../assets/banners/categoris_ku.jpg");
        case "brands_en":
          return require("../assets/banners/brands_en.jpg");
        case "brands_ar":
          return require("../assets/banners/brands_ar.jpg");
        case "brands_ku":
          return require("../assets/banners/brands_ku.jpg");
        case "additions_en":
          return require("../assets/banners/additions_en.jpg");
        case "additions_ar":
          return require("../assets/banners/additions_ar.jpg");
        case "addition_ku":
          return require("../assets/banners/addition_ku.jpg");
        case "discounts_en":
          return require("../assets/banners/discounts_en.jpg");
        case "discounts_ar":
          return require("../assets/banners/discounts_ar.jpg");
        case "discounts_ku":
          return require("../assets/banners/discounts_ku.jpg");
        case "populer_en":
          return require("../assets/banners/populer_en.jpg");
        case "populer_ar":
          return require("../assets/banners/populer_ar.jpg");
        case "populer_ku":
          return require("../assets/banners/populer_ku.jpg");
        case "special_en":
          return require("../assets/banners/special_en.jpg");
        case "special_ar":
          return require("../assets/banners/special_ar.jpg");
        case "special_ku":
          return require("../assets/banners/special_ku.jpg");
        default:
          return null;
      }
    } catch (error) {
      console.error(`Failed to load banner: ${filename}`, error);
      return null;
    }
  };

  const bannerSource = getBannerSource();

  if (!bannerSource) {
    return <View style={[styles.container, style]}>{children}</View>;
  }

  // Button positioning based on language
  const isRTLLanguage = locale !== "ar" || locale !== "ku";
  const buttonPosition = !isRTLLanguage ? { left: 12 } : { right: 12 };

  return (
    <View style={{ position: "relative", width: "100%" }}>
      <TouchableOpacity
        style={[
          {
            position: "absolute",
            top: 35,
            zIndex: 10,
            backgroundColor: "rgba(0,0,0,0.5)",
            paddingHorizontal: 10,
            paddingVertical: 6,
            borderRadius: 20,
          },
          buttonPosition,
        ]}
        onPress={() => {
          if (route) {
            router.push(route);
          }
        }}
      >
        <Text style={{ color: "#fff", fontSize: 12 }}>
          {locale === "ar"
            ? "عرض الجميع"
            : locale === "ku"
              ? "بینینی هەموو"
              : "see all"}
        </Text>
      </TouchableOpacity>

      <ImageBackground
        source={bannerSource}
        style={[styles.container, style]}
        imageStyle={styles.bannerImage}
        resizeMode={resizeMode}
      >
        {children}
      </ImageBackground>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: "100%",
    overflow: "hidden",
  },
  bannerImage: {
    borderRadius: 0,
  },
});
