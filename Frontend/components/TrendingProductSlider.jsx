import React, { useEffect, useState } from "react";
import {
  View,
  StyleSheet,
  ScrollView,
  Pressable,
  Dimensions,
  ActivityIndicator,
} from "react-native";
import { Image } from "expo-image";
import { useRouter } from "expo-router";
import { useTheme } from "../utils/ThemeContext";
import { useLanguage } from "../utils/LanguageContext";
import { TrendingUp, Star } from "lucide-react-native";
import { getProductImageUrl } from "../utils/productImages";
import { Text } from "./ui/Text";
import apiService from "../services/apiService";

const { width: screenWidth } = Dimensions.get("window");
const CARD_WIDTH = screenWidth * 0.65;

export default function TrendingProductSlider() {
  const { theme, isDark } = useTheme();
  const { t } = useLanguage();
  const router = useRouter();

  const [trendingProducts, setTrendingProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchTrendingProducts();
  }, []);

  const fetchTrendingProducts = async () => {
    try {
      setLoading(true);
      console.log("🔥 Fetching trending products...");
      const response = await apiService.get("/api/products", {
        params: {
          is_trend: 1,
          limit: 20,
          offset: 0,
        },
      });
      console.log("📦 Full API Response:", response.data);
      const products = response.data?.data || response.data || [];
      console.log("✅ API returned products:", products.length);

      // Filter to ensure only trending products (is_trend === 1)
      const trendingOnly = products.filter(
        (p) => p.is_trend === 1 || p.is_trend === true,
      );
      console.log("📋 Filtered trending products:", trendingOnly.length);

      setTrendingProducts(trendingOnly);
      setError(null);
    } catch (error) {
      console.error("❌ Error fetching trending products:", error);
      console.error("Error details:", error.response?.data || error.message);
      setError(error.message || "Failed to load trending products");
      setTrendingProducts([]);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
        <Text style={{ marginTop: 8, color: theme.colors.textSecondary }}>
          Loading trending products...
        </Text>
      </View>
    );
  }
  if (error) {
    return (
      <View style={[styles.loadingContainer, { padding: 20 }]}>
        <Text style={{ color: "#EF4444", fontSize: 14, textAlign: "center" }}>
          ⚠️ {error}
        </Text>
        <Pressable
          onPress={fetchTrendingProducts}
          style={{
            marginTop: 12,
            paddingHorizontal: 16,
            paddingVertical: 8,
            backgroundColor: theme.colors.primary,
            borderRadius: 8,
          }}
        >
          <Text style={{ color: "#fff", fontSize: 14 }}>Retry</Text>
        </Pressable>
      </View>
    );
  }

  //
  // Hide section if no trending products
  if (trendingProducts.length === 0) {
    console.log("⚠️ No trending products to display");
    return null;
  }

  console.log("🎉 Rendering", trendingProducts.length, "trending products");

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.titleContainer}>
          <View
            style={[
              styles.accentBar,
              { backgroundColor: theme.colors.primary },
            ]}
          />
          <TrendingUp
            size={22}
            color={theme.colors.primary}
            style={{ marginRight: 8 }}
          />
          <Text style={[styles.title, { color: theme.colors.text }]}>
            {t("trendingProducts") || "Trending Products"}
          </Text>
        </View>
      </View>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
        decelerationRate="fast"
        snapToInterval={CARD_WIDTH + 16}
      >
        {trendingProducts.map((product, index) => (
          <TrendingProductCard
            key={product.id}
            product={product}
            theme={theme}
            isDark={isDark}
            isLast={index === trendingProducts.length - 1}
            onPress={() => router.push(`/product/${product.id}`)}
          />
        ))}
      </ScrollView>
    </View>
  );
}

function TrendingProductCard({ product, onPress, theme, isDark, isLast }) {
  const { isRTL, locale } = useLanguage();

  const getLocalizedText = (field) => {
    const lang = locale || "en";
    return product[`${field}_${lang}`] || product[field] || "";
  };

  const imageUrl = getProductImageUrl(
    product,
    "https://via.placeholder.com/300",
  );

  // Price calculation
  const sell = Number(product?.sell_price) || 0;
  const discount = Number(product?.discount) || 0;
  const commission = Number(product?.commission_price) || 0;

  let finalPrice = sell;
  let badgeText = "";
  let hasBadge = false;

  const type = (product?.discount_type || "").toLowerCase();
  const isPercentage =
    type === "percentage" || type === "parsentage" || type === "percent";
  const isFixed = type === "fixed";

  if (discount > 0) {
    hasBadge = true;
    if (isPercentage) {
      const savedAmount = (sell * discount) / 100;
      finalPrice = sell - savedAmount;
      badgeText = `-${Math.round(discount)}%`;
    } else if (isFixed) {
      finalPrice = sell - discount;
      badgeText = `-${discount.toLocaleString()} ${isRTL ? "د" : "IQD"}`;
    }
  }

  finalPrice = Math.max(0, finalPrice);
  const displayPrice = Math.round(finalPrice);
  const originalPrice = Math.round(sell);

  return (
    <Pressable
      style={[
        styles.card,
        {
          backgroundColor: theme.colors.card,
          marginRight: isLast ? 0 : 16,
          borderColor: theme.colors.primary + "30",
        },
      ]}
      onPress={onPress}
    >
      {/* Trending Badge */}
      <View
        style={[
          styles.trendingBadge,
          { backgroundColor: theme.colors.primary },
        ]}
      >
        <TrendingUp size={14} color="#fff" />
        <Text style={styles.trendingText}>TRENDING</Text>
      </View>


      <View style={styles.imageContainer}>
        <Image
          source={{ uri: imageUrl }}
          style={styles.image}
          contentFit="cover"
          transition={200}
        />
      </View>

      <View style={styles.info}>
        <Text
          style={[styles.name, { color: theme.colors.text }]}
          numberOfLines={2}
        >
          {getLocalizedText("name")}
        </Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    paddingVertical: 40,
    alignItems: "center",
    justifyContent: "center",
  },
  container: {
    marginTop: 20,
    marginVertical: 10,
  },
  header: {
    paddingHorizontal: 16,
    marginBottom: 16,
  },
  titleContainer: {
    flexDirection: "row",
    alignItems: "center",
  },
  accentBar: {
    width: 4,
    height: 24,
    borderRadius: 2,
    marginRight: 8,
  },
  title: {
    fontSize: 20,
  },
  scrollContent: {
    paddingHorizontal: 16,
  },
  card: {
    width: CARD_WIDTH,
    borderRadius: 16,
    overflow: "hidden",

  },
  trendingBadge: {
    position: "absolute",
    top: 12,
    left: 12,
    zIndex: 10,
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 20,
  },
  trendingText: {
    color: "#fff",
    fontSize: 11,

    letterSpacing: 0.5,
  },
  discountBadge: {
    position: "absolute",
    top: 12,
    right: 12,
    zIndex: 10,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 20,
  },
  discountText: {
    color: "#fff",
    fontSize: 12,
  },
  imageContainer: {
    width: "100%",
    height: 200,
    backgroundColor: "#f3f4f6",
  },
  image: {
    width: "100%",
    height: "100%",
  },
  info: {
    padding: 12,
  },
  name: {
    fontSize: 15,

    marginBottom: 6,
  },
  ratingRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginBottom: 8,
  },
  rating: {
    fontSize: 13,
  },
  priceRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 4,
  },
  price: {
    fontSize: 18,
  },
  originalPrice: {
    fontSize: 14,

    textDecorationLine: "line-through",
  },
  commissionRow: {
    marginTop: 4,
  },
  commission: {
    fontSize: 12,
  },
});
