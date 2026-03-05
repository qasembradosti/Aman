import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  View,
  StyleSheet,
  FlatList,
  Pressable,
  Dimensions,
  ActivityIndicator,
} from "react-native";
import { Image } from "expo-image";
import { useRouter } from "expo-router";
import { useTheme } from "../utils/ThemeContext";
import { useLanguage } from "../utils/LanguageContext";
import { Star } from "lucide-react-native";
import { getProductImageUrl } from "../utils/productImages";
import { Text } from "./ui/Text";
import apiService from "../services/apiService";
import SectionBanner from "./SectionBanner";

const { width: screenWidth } = Dimensions.get("window");
const CARD_WIDTH = screenWidth * 0.38;
const PAGE_SIZE = 12;

export default function TrendingProductSlider() {
  const { theme } = useTheme();
  const router = useRouter();

  const [trendingProducts, setTrendingProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [offset, setOffset] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [error, setError] = useState(null);
  const didInitialLoad = useRef(false);

  const fetchTrendingProducts = useCallback(async (append = false) => {
    if (append) {
      if (loading || loadingMore || !hasMore) return;
      setLoadingMore(true);
    } else {
      setLoading(true);
      setError(null);
      setOffset(0);
      setHasMore(true);
    }

    const requestOffset = append ? offset : 0;
    try {
      const response = await apiService.get("/api/products", {
        params: {
          is_trend: 1,
          limit: PAGE_SIZE,
          offset: requestOffset,
        },
      });
      const rawProducts = response.data?.data || response.data || [];

      // Filter to ensure only trending products (is_trend === 1)
      const trendingOnly = rawProducts.filter(
        (p) => p.is_trend === 1 || p.is_trend === true,
      );

      if (append) {
        setTrendingProducts((prev) => {
          const existingIds = new Set(prev.map((item) => String(item.id)));
          const nextItems = trendingOnly.filter(
            (item) => !existingIds.has(String(item.id)),
          );
          return nextItems.length > 0 ? [...prev, ...nextItems] : prev;
        });
      } else {
        setTrendingProducts(trendingOnly);
      }
      setOffset(requestOffset + rawProducts.length);
      setHasMore(rawProducts.length >= PAGE_SIZE);
      setError(null);
    } catch (error) {
      console.error("Error details:", error.response?.data || error.message);
      setError(error.message || "Failed to load trending products");
      if (!append) {
        setTrendingProducts([]);
        setHasMore(false);
      }
    } finally {
      if (append) {
        setLoadingMore(false);
      } else {
        setLoading(false);
      }
    }
  }, [loading, loadingMore, hasMore, offset]);

  useEffect(() => {
    if (didInitialLoad.current) return;
    didInitialLoad.current = true;
    fetchTrendingProducts(false);
  }, [fetchTrendingProducts]);

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
          onPress={() => fetchTrendingProducts(false)}
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
    return null;
  }

  return (
    <SectionBanner
      type="popular"
      resizeMode="stretch"
      style={styles.container}
      route="/products?is_trend=1"
    >
      <FlatList
        data={trendingProducts}
        horizontal
        keyExtractor={(item) => String(item.id)}
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
        decelerationRate="fast"
        style={{ marginTop: 70 }}
        snapToInterval={CARD_WIDTH + 16}
        renderItem={({ item, index }) => (
          <TrendingProductCard
            product={item}
            theme={theme}
            isLast={index === trendingProducts.length - 1}
            onPress={() => router.push(`/product/${item.id}`)}
          />
        )}
        onEndReachedThreshold={0.35}
        onEndReached={() => fetchTrendingProducts(true)}
        ListFooterComponent={
          loadingMore ? (
            <View style={styles.listFooter}>
              <ActivityIndicator size="small" color={theme.colors.primary} />
            </View>
          ) : null
        }
      />
    </SectionBanner>
  );
}

function TrendingProductCard({ product, onPress, theme, isLast }) {
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
  let finalPrice = sell;

  const type = (product?.discount_type || "").toLowerCase();
  const isPercentage =
    type === "percentage" || type === "parsentage" || type === "percent";
  const isFixed = type === "fixed";

  if (discount > 0) {
    if (isPercentage) {
      const savedAmount = (sell * discount) / 100;
      finalPrice = sell - savedAmount;
    } else if (isFixed) {
      finalPrice = sell - discount;
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

        {/* Rating */}
        {product.rating > 0 && (
          <View style={styles.ratingRow}>
            <Star size={12} color="#FFA500" fill="#FFA500" />
            <Text
              style={[styles.rating, { color: theme.colors.textSecondary }]}
            >
              {Number(product.rating).toFixed(1)}
            </Text>
          </View>
        )}

        {/* Price */}
        <View style={styles.priceRow}>
          <Text style={[styles.price, { color: theme.colors.primary }]}>
            {displayPrice.toLocaleString()} {isRTL ? "دینار" : "IQD"}
          </Text>
          {discount > 0 && (
            <Text
              style={[
                styles.originalPrice,
                { color: theme.colors.textSecondary },
              ]}
            >
              {originalPrice.toLocaleString()}
            </Text>
          )}
        </View>
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
    marginTop: 0,
    marginVertical: 0,
    paddingVertical: 10,
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
  listFooter: {
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 12,
  },
  card: {
    width: CARD_WIDTH,
    borderRadius: 12,
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
    height: 140,
    backgroundColor: "#f3f4f6",
  },
  image: {
    width: "100%",
    height: "100%",
  },
  info: {
    padding: 10,
  },
  name: {
    fontSize: 13,
    fontWeight: "500",
    marginBottom: 6,
  },
  ratingRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginBottom: 6,
  },
  rating: {
    fontSize: 12,
  },
  priceRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 6,
  },
  price: {
    fontSize: 14,
    fontWeight: "600",
  },
  originalPrice: {
    fontSize: 11,

    textDecorationLine: "line-through",
  },
  commissionRow: {
    marginTop: 4,
  },
  commission: {
    fontSize: 11,
    fontWeight: "500",
  },
});
