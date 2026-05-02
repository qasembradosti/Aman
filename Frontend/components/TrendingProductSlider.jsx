import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  View,
  StyleSheet,
  FlatList,
  Pressable,
  ActivityIndicator,
} from "react-native";
import { Image } from "expo-image";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useTheme } from "../utils/ThemeContext";
import { useLanguage } from "../utils/LanguageContext";
import { Star } from "lucide-react-native";
import { getProductImageUrl } from "../utils/productImages";
import { Text } from "./ui/Text";
import apiService from "../services/apiService";
import SectionBanner from "./SectionBanner";
import { useResponsiveLayout } from "../utils/useResponsiveLayout";

const PAGE_SIZE = 12;

export default function TrendingProductSlider() {
  const { theme } = useTheme();
  const layout = useResponsiveLayout();
  const router = useRouter();

  const [trendingProducts, setTrendingProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [offset, setOffset] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [error, setError] = useState(null);
  const didInitialLoad = useRef(false);

  const fetchTrendingProducts = useCallback(
    async (append = false) => {
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
        const rawProducts = response?.data?.data || response?.data || [];
        const trendingOnly = rawProducts.filter(
          (product) =>
            product?.is_trend === 1 || product?.is_trend === true,
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
      } catch (fetchError) {
        console.error(
          "Error details:",
          fetchError?.response?.data || fetchError?.message,
        );
        setError(fetchError?.message || "Failed to load trending products");

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
    },
    [hasMore, loading, loadingMore, offset],
  );

  useEffect(() => {
    if (didInitialLoad.current) return;
    didInitialLoad.current = true;
    fetchTrendingProducts(false);
  }, [fetchTrendingProducts]);

  const featuredColumns = layout.isTablet
    ? layout.getGridColumns(2, 3, 4, 5)
    : 2;
  const cardGap = layout.cardGap;
  const cardWidth = layout.getCardWidth(featuredColumns, cardGap);
  const imageHeight = layout.isTablet
    ? Math.max(164, Math.round(cardWidth * 0.82))
    : layout.isSmallPhone
      ? 100
      : layout.isMediumPhone
        ? 112
        : 124;
  const sectionTopInset = layout.sectionBannerOffset;

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
          {error}
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
        contentContainerStyle={[
          styles.scrollContent,
          { paddingHorizontal: layout.horizontalPadding },
        ]}
        decelerationRate="fast"
        style={{ marginTop: sectionTopInset }}
        snapToInterval={cardWidth + cardGap}
        renderItem={({ item, index }) => (
          <TrendingProductCard
            product={item}
            theme={theme}
            isLast={index === trendingProducts.length - 1}
            cardWidth={cardWidth}
            imageHeight={imageHeight}
            cardGap={cardGap}
            layout={layout}
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

function TrendingProductCard({
  product,
  onPress,
  theme,
  isLast,
  cardWidth,
  imageHeight,
  cardGap,
  layout,
}) {
  const { isRTL, locale, t } = useLanguage();

  const getLocalizedText = (field) => {
    const lang = locale || "en";
    return product[`${field}_${lang}`] || product[field] || "";
  };

  const imageUrl = getProductImageUrl(
    product,
    "https://via.placeholder.com/400",
  );
  const sell = Number(product?.sell_price) || 0;
  const discount = Number(product?.discount) || 0;
  const commission = Number(product?.commission_price) || 0;
  const ratingValue = Number(product?.average_rating ?? product?.rating) || 0;
  const reviewCount = Number(product?.review_count) || 0;
  const type = (product?.discount_type || "").toLowerCase();
  const isPercentage =
    type === "percentage" || type === "parsentage" || type === "percent";
  const isFixed = type === "fixed";
  let finalPrice = sell;
  let badgeText = "";

  if (discount > 0) {
    if (isPercentage) {
      finalPrice = sell - (sell * discount) / 100;
      badgeText = `-${Math.round(discount)}%`;
    } else if (isFixed) {
      finalPrice = sell - discount;
      badgeText = `-${Math.round(discount).toLocaleString(locale || undefined)}`;
    }
  }

  finalPrice = Math.max(0, finalPrice);

  const formatCurrency = (value) =>
    `${Math.round(Number(value) || 0).toLocaleString(locale || undefined)} ${
      t("currency") || "IQD"
    }`;
  const displayPrice = Math.round(finalPrice);
  const originalPrice = Math.round(sell);
  const leadingBadgePosition = isRTL ? { right: 10 } : { left: 10 };
  const trailingBadgePosition = isRTL ? { left: 10 } : { right: 10 };

  return (
    <Pressable
      style={({ pressed }) => [
        styles.card,
        {
          backgroundColor: theme.colors.card,
          width: cardWidth,
          borderColor: theme.colors.border || "#E5E7EB",
          marginRight: isRTL ? 0 : isLast ? 0 : cardGap,
          marginLeft: isRTL ? (isLast ? 0 : cardGap) : 0,
        },
        pressed && styles.cardPressed,
      ]}
      onPress={onPress}
    >
      <View style={[styles.imageContainer, { height: imageHeight }]}>
        <Image
          source={{ uri: imageUrl }}
          style={styles.image}
          contentFit="cover"
          transition={200}
          cachePolicy="memory-disk"
        />

        {commission > 0 ? (
          <View
            style={[
              styles.bonusTag,
              { backgroundColor: "#16A34A" },
              leadingBadgePosition,
            ]}
          >
            <Text style={styles.bonusTagText}>+{formatCurrency(commission)}</Text>
          </View>
        ) : null}

        {badgeText ? (
          <View
            style={[
              styles.discountBadge,
              trailingBadgePosition,
            ]}
          >
            <View style={styles.discountBadgeContent}>
              <Ionicons
                name="pricetag-outline"
                size={layout.isTablet ? 12 : 11}
                color="#fff"
              />
              <Text style={styles.discountBadgeText}>{badgeText}</Text>
            </View>
          </View>
        ) : (
          <View
            style={[
              styles.trendingBadge,
              trailingBadgePosition,
            ]}
          >
            <Ionicons
              name="flame-outline"
              size={layout.isTablet ? 14 : 13}
              color="#fff"
            />
          </View>
        )}
      </View>

      <View
        style={[
          styles.info,
          {
            padding: 10,
          },
        ]}
      >
        <Text
          style={[
            styles.name,
            {
              color: theme.colors.text,
              fontSize: layout.productNameSize,
              minHeight: layout.isTablet ? 38 : 32,
            },
          ]}
          numberOfLines={2}
        >
          {getLocalizedText("name")}
        </Text>

        {ratingValue > 0 ? (
          <View style={styles.ratingRow}>
            <Star size={12} color="#F59E0B" fill="#F59E0B" />
            <Text
              style={[styles.rating, { color: theme.colors.textSecondary }]}
            >
              {ratingValue.toFixed(1)}
            </Text>
            {reviewCount > 0 ? (
              <Text
                style={[
                  styles.reviewCount,
                  { color: theme.colors.textSecondary },
                ]}
              >
                ({reviewCount})
              </Text>
            ) : null}
          </View>
        ) : null}

        <View style={styles.bottomRow}>
          <View style={styles.priceColumn}>
            <Text
              style={[
                styles.price,
                {
                  color: theme.colors.primary,
                  fontSize: layout.productPriceSize,
                },
              ]}
            >
              {formatCurrency(displayPrice)}
            </Text>
            {originalPrice > displayPrice ? (
              <Text
                style={[
                  styles.originalPrice,
                  { color: theme.colors.textSecondary },
                ]}
              >
                {formatCurrency(originalPrice)}
              </Text>
            ) : null}
          </View>
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
    paddingTop: 10,
    paddingBottom: 0,
  },
  scrollContent: {
    paddingBottom: 8,
  },
  listFooter: {
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 12,
  },
  card: {
    backgroundColor: "#fff",
    overflow: "hidden",
    position: "relative",
    borderWidth: 1,
    borderRadius: 20,
    shadowColor: "#0F172A",
    shadowOpacity: 0.05,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2,
  },
  cardPressed: {
    transform: [{ scale: 0.97 }],
  },
  imageContainer: {
    width: "100%",
    backgroundColor: "#f9f9f9",
    overflow: "hidden",
    justifyContent: "center",
    alignItems: "center",
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
  },
  image: {
    width: "100%",
    height: "100%",
  },
  bonusTag: {
    position: "absolute",
    top: 10,
    paddingVertical: 5,
    paddingHorizontal: 10,
    borderRadius: 12,
  },
  bonusTagText: {
    color: "#fff",
    fontSize: 8,
  },
  trendingBadge: {
    position: "absolute",
    top: 10,
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: "#F97316",
    justifyContent: "center",
    alignItems: "center",
  },
  discountBadge: {
    position: "absolute",
    top: 10,
    paddingVertical: 5,
    paddingHorizontal: 10,
    borderRadius: 12,
    backgroundColor: "#F97316",
  },
  discountBadgeContent: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  discountBadgeText: {
    color: "#fff",
    fontSize: 8,
  },
  info: {
    flex: 1,
    justifyContent: "space-between",
  },
  name: {
    marginBottom: 8,
    lineHeight: 16,
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
  reviewCount: {
    fontSize: 11,
    marginLeft: 2,
  },
  bottomRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: "auto",
  },
  priceColumn: {
    gap: 3,
  },
  price: {
    fontSize: 16,
  },
  originalPrice: {
    fontSize: 11,
    textDecorationLine: "line-through",
  },
});
