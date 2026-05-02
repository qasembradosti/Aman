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
import SectionBanner from "./SectionBanner";
import apiService from "../services/apiService";
import { useResponsiveLayout } from "../utils/useResponsiveLayout";

const PAGE_SIZE = 12;
const FETCH_BATCH_SIZE = 60;

export default function DiscountProductSlider() {
  const { theme } = useTheme();
  const layout = useResponsiveLayout();
  const router = useRouter();
  const [discountProducts, setDiscountProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [offset, setOffset] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const didInitialLoad = useRef(false);

  const getDiscountedProducts = (items = []) =>
    items.filter((product) => (Number(product?.discount) || 0) > 0);

  const mergeUniqueProducts = (currentItems = [], nextItems = []) => {
    const seenIds = new Set();
    const merged = [];

    [...currentItems, ...nextItems].forEach((item) => {
      const itemId = String(item?.id ?? "");
      if (!itemId || seenIds.has(itemId)) {
        return;
      }

      seenIds.add(itemId);
      merged.push(item);
    });

    return merged;
  };

  const fetchProductsBatch = useCallback(async (requestOffset) => {
    const response = await apiService.get("/api/products", {
      params: {
        in_stock: 1,
        limit: FETCH_BATCH_SIZE,
        offset: requestOffset,
      },
    });

    const responseData = response?.data;
    const rawProducts = Array.isArray(responseData?.data)
      ? responseData.data
      : Array.isArray(responseData)
        ? responseData
        : [];
    const totalFromMeta = Number(responseData?.meta?.total);

    return {
      rawProducts,
      total: Number.isFinite(totalFromMeta) ? totalFromMeta : null,
    };
  }, []);

  const loadDiscountProducts = useCallback(
    async (append = false) => {
      if (append) {
        if (loading || loadingMore || !hasMore) {
          return;
        }
        setLoadingMore(true);
      } else {
        setLoading(true);
        setOffset(0);
        setHasMore(true);
      }

      let nextOffset = append ? offset : 0;
      let moreAvailable = true;
      let totalProducts = null;
      let collected = [];

      try {
        while (moreAvailable && collected.length < PAGE_SIZE) {
          const { rawProducts, total } = await fetchProductsBatch(nextOffset);

          if (typeof total === "number") {
            totalProducts = total;
          }

          if (rawProducts.length === 0) {
            moreAvailable = false;
            break;
          }

          collected = mergeUniqueProducts(
            collected,
            getDiscountedProducts(rawProducts),
          );
          nextOffset += rawProducts.length;

          if (rawProducts.length < FETCH_BATCH_SIZE) {
            moreAvailable = false;
          }

          if (
            typeof totalProducts === "number" &&
            nextOffset >= totalProducts
          ) {
            moreAvailable = false;
          }
        }

        if (append) {
          setDiscountProducts((prev) => mergeUniqueProducts(prev, collected));
        } else {
          setDiscountProducts(collected);
        }

        setOffset(nextOffset);
        setHasMore(moreAvailable);
      } catch (_error) {
        if (!append) {
          setDiscountProducts([]);
        }
        setHasMore(false);
      } finally {
        if (append) {
          setLoadingMore(false);
        } else {
          setLoading(false);
        }
      }
    },
    [fetchProductsBatch, hasMore, loading, loadingMore, offset],
  );

  useEffect(() => {
    if (didInitialLoad.current) return;
    didInitialLoad.current = true;
    loadDiscountProducts(false);
  }, [loadDiscountProducts]);

  const featuredColumns = layout.isTablet
    ? layout.getGridColumns(2, 3, 4, 5)
    : 2;
  const cardGap = layout.cardGap;
  const cardWidth = layout.getCardWidth(featuredColumns, cardGap);
  const imageHeight = layout.isTablet
    ? Math.max(176, Math.round(cardWidth * 0.92))
    : layout.isSmallPhone
      ? 112
      : layout.isMediumPhone
        ? 124
        : 136;
  const sectionTopInset = layout.sectionBannerOffset;

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
    <SectionBanner
      type="discounts"
      resizeMode="stretch"
      style={styles.container}
      route="/products"
    >
      <FlatList
        data={discountProducts}
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
          <DiscountProductCard
            product={item}
            theme={theme}
            isLast={index === discountProducts.length - 1}
            cardWidth={cardWidth}
            imageHeight={imageHeight}
            cardGap={cardGap}
            layout={layout}
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

function DiscountProductCard({
  product,
  onPress,
  theme,
  isLast,
  cardWidth,
  imageHeight,
  cardGap,
  layout,
}) {
  const { locale, t, isRTL } = useLanguage();

  const getLocalizedText = (field) => {
    const lang = locale || "en";
    return product[`${field}_${lang}`] || product[field] || "";
  };

  const formatCurrency = (value) =>
    `${Math.round(Number(value) || 0).toLocaleString(locale || undefined)} ${
      t("currency") || "IQD"
    }`;

  const imageUrl = getProductImageUrl(
    product,
    "https://via.placeholder.com/300",
  );

  const sell = Number(product?.sell_price) || 0;
  const discount = Number(product?.discount) || 0;
  const commission = Number(product?.commission_price) || 0;
  const ratingValue = Number(product?.average_rating ?? product?.rating) || 0;

  let finalPrice = sell;
  let badgeText = "";

  const type = (product?.discount_type || "").toLowerCase();
  const isPercentage =
    type === "percentage" || type === "parsentage" || type === "percent";
  const isFixed = type === "fixed";

  if (discount > 0) {
    if (isPercentage) {
      finalPrice = sell - (sell * discount) / 100;
      badgeText = `-${Math.round(discount)}%`;
    } else if (isFixed) {
      finalPrice = sell - discount;
      badgeText = `-${Math.round(discount).toLocaleString()}`;
    }
  }

  finalPrice = Math.max(0, finalPrice);
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
          borderRadius: 20,
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
              {
                backgroundColor: "#16A34A",
              },
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
        ) : null}
      </View>

      <View
        style={[
          styles.productInfo,
          {
            padding: 10,
          },
        ]}
      >
        <Text
          style={[
            styles.productName,
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
            <Text style={[styles.rating, { color: theme.colors.textSecondary }]}>
              {ratingValue.toFixed(1)}
            </Text>
            {product.review_count > 0 ? (
              <Text
                style={[
                  styles.reviewCount,
                  { color: theme.colors.textSecondary },
                ]}
              >
                ({product.review_count})
              </Text>
            ) : null}
          </View>
        ) : null}

        <View style={styles.bottomRow}>
          <View style={styles.priceColumn}>
            <Text
              style={[
                styles.productPrice,
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
                  styles.discountedOriginalPrice,
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
  container: {
    marginBottom: 0,
    paddingTop: 12,
    paddingBottom: 0,
  },
  loadingContainer: {
    padding: 20,
    alignItems: "center",
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
    borderColor: "#e9ecef",
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
  productInfo: {
    flex: 1,
    justifyContent: "space-between",
  },
  productName: {
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
  bottomRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: "auto",
  },
  priceColumn: {
    gap: 3,
  },
  productPrice: {
    fontSize: 16,
    color: "#1a1a1a",
  },
  discountedOriginalPrice: {
    fontSize: 11,
    textDecorationLine: "line-through",
  },
  reviewCount: {
    fontSize: 11,
    marginLeft: 2,
  },
});
