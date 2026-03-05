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
import SectionBanner from "./SectionBanner";
import api from "../services/apiService";

const { width: screenWidth } = Dimensions.get("window");
const CARD_WIDTH = screenWidth * 0.38;
const PAGE_SIZE = 12;

export default function DiscountProductSlider() {
  const { theme } = useTheme();
  const router = useRouter();
  const [discountProducts, setDiscountProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [offset, setOffset] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [supportsDiscountFilter, setSupportsDiscountFilter] = useState(true);
  const didInitialLoad = useRef(false);

  const getDiscountedProducts = (items = []) =>
    items.filter((product) => (Number(product?.discount) || 0) > 0);

  const loadDiscountProducts = useCallback(async (append = false) => {
    if (append) {
      if (loading || loadingMore || !hasMore || !supportsDiscountFilter) return;
      setLoadingMore(true);
    } else {
      setLoading(true);
      setOffset(0);
      setHasMore(true);
      setSupportsDiscountFilter(true);
    }

    const requestOffset = append ? offset : 0;

    try {
      // Preferred: backend-filtered discounted products
      const response = await api.get("/api/products", {
        params: {
          has_discount: 1,
          in_stock: true,
          limit: PAGE_SIZE,
          offset: requestOffset,
        },
      });

      const rawProducts = response?.data?.data || response?.data || [];
      const discounted = getDiscountedProducts(rawProducts);

      if (append) {
        setDiscountProducts((prev) => {
          const existingIds = new Set(prev.map((item) => String(item.id)));
          const nextItems = discounted.filter(
            (item) => !existingIds.has(String(item.id)),
          );
          return nextItems.length > 0 ? [...prev, ...nextItems] : prev;
        });
      } else {
        setDiscountProducts(discounted);
      }

      setOffset(requestOffset + rawProducts.length);
      setHasMore(rawProducts.length >= PAGE_SIZE);
      setSupportsDiscountFilter(true);
    } catch (_error) {
      if (append) {
        setHasMore(false);
        return;
      }

      // Fallback: old backend without has_discount support
      try {
        const fallbackResponse = await api.get("/api/products", {
          params: { in_stock: true, limit: 100, offset: 0 },
        });
        const fallbackRaw =
          fallbackResponse?.data?.data || fallbackResponse?.data || [];
        const discounted = getDiscountedProducts(fallbackRaw);
        setDiscountProducts(discounted);
        setOffset(discounted.length);
        setHasMore(false);
        setSupportsDiscountFilter(false);
      } catch {
        setDiscountProducts([]);
        setHasMore(false);
      }
    } finally {
      if (append) {
        setLoadingMore(false);
      } else {
        setLoading(false);
      }
    }
  }, [loading, loadingMore, hasMore, supportsDiscountFilter, offset]);

  useEffect(() => {
    if (didInitialLoad.current) return;
    didInitialLoad.current = true;
    loadDiscountProducts(false);
  }, [loadDiscountProducts]);

  if (loading && discountProducts.length === 0) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
      </View>
    );
  }

  if (!loading && discountProducts.length === 0) {
    return null;
  }

  return (
    <SectionBanner type="discounts" resizeMode="stretch" style={styles.container} route="/products">
      <FlatList
        data={discountProducts}
        horizontal
        keyExtractor={(item) => String(item.id)}
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
        decelerationRate="fast"
        style={{ marginTop: 80 }}
        snapToInterval={CARD_WIDTH + 16}
        renderItem={({ item, index }) => (
          <DiscountProductCard
            product={item}
            theme={theme}
            isLast={index === discountProducts.length - 1}
            onPress={() => router.push(`/product/${item.id}`)}
          />
        )}
        onEndReachedThreshold={0.35}
        onEndReached={() => loadDiscountProducts(true)}
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

function DiscountProductCard({ product, onPress, theme, isLast }) {
  const { isRTL, locale } = useLanguage();

  const getLocalizedText = (field) => {
    const lang = locale || "en";
    return product[`${field}_${lang}`] || product[field] || "";
  };

  const imageUrl = getProductImageUrl(
    product,
    "https://via.placeholder.com/300",
  );

  // ===============================
  // 🔥 DISCOUNT CALCULATION (YOUR RULES)
  // ===============================
  const sell = Number(product?.sell_price) || 0;
  const discount = Number(product?.discount) || 0;

  let finalPrice = sell;
  let badgeText = "";
  let savedAmount = 0;

  const type = (product?.discount_type || "").toLowerCase();
  const isPercentage =
    type === "percentage" || type === "parsentage" || type === "percent";
  const isFixed = type === "fixed";

  if (discount > 0) {
    if (isPercentage) {
      savedAmount = (sell * discount / 100);
      finalPrice = sell - savedAmount;
      badgeText = `-${Math.round(discount)}%`;
    } else if (isFixed) {
      savedAmount = discount;
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
        },
      ]}
      onPress={onPress}
    >
      {badgeText ? (
        <View style={styles.discountBadge}>
          <Text style={styles.discountText}>{badgeText}</Text>
        </View>
      ) : null}

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

        {product.rating && (
          <View style={styles.ratingRow}>
            <Star size={14} color="#FFA500" fill="#FFA500" />
            <Text style={[styles.rating, { color: theme.colors.textSecondary }]}>
              {product.rating.toFixed(1)}
            </Text>
          </View>
        )}

        <View style={styles.priceRow}>
          <Text style={[styles.price, { color: theme.colors.primary }]}>
            {isRTL
              ? `${displayPrice.toLocaleString()} دینار`
              : `${displayPrice.toLocaleString()} IQD`}
          </Text>
          <Text style={[styles.originalPrice, { color: theme.colors.textSecondary }]}>
            {isRTL
              ? `${originalPrice.toLocaleString()} د`
              : `${originalPrice.toLocaleString()}`}
          </Text>
        </View>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: { 
    marginBottom: 0,
    paddingVertical: 10,
  },
  loadingContainer: { padding: 20, alignItems: "center" },

  header: {
    paddingHorizontal: 20,
    marginBottom: 18,
  },

  titleContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },

  accentBar: {
    width: 5,
    height: 26,
    borderRadius: 3,
  },

  title: {
    fontSize: 22,
    letterSpacing: 0.3,
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
    overflow: 'hidden',
  },

  discountBadge: {
    position: "absolute",
    top: 8,
    left: 8,
    zIndex: 10,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    backgroundColor: "#FF3B30",
  },

  discountText: {
    color: "#fff",
    fontSize: 11,
    letterSpacing: 0.2,
  },

  imageContainer: {
    width: "100%",
    height: 120,
    backgroundColor: '#F8F9FA',
  },

  image: {
    width: "100%",
    height: "100%",
  },

  info: {
    padding: 8,
  },

  name: {
    fontSize: 12,
    marginBottom: 4,
    lineHeight: 16,
  },

  ratingRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    marginBottom: 10,
  },

  rating: {
    fontSize: 12,
  },

  priceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flexWrap: 'wrap',
  },

  price: {
    fontSize: 14,
    letterSpacing: 0.2,
    fontWeight: '600',
  },

  originalPrice: {
    fontSize: 11,
    textDecorationLine: 'line-through',
    opacity: 0.5,
  },
});
