import React, { useState, useEffect, useCallback } from "react";
import {
  View,
  StyleSheet,
  ScrollView,
  RefreshControl,
  TouchableOpacity,
  Pressable,
  Dimensions,
  Text as RNText,
  Share,
} from "react-native";
import { Image } from "expo-image";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useDispatch, useSelector } from "react-redux";
import { useLanguage } from "../../utils/LanguageContext";
import { useTheme } from "../../utils/ThemeContext";
import { fetchProducts } from "../../store/slices/productsSlice";
import { fetchCategories } from "../../store/slices/categoriesSlice";
import { fetchBrands } from "../../store/slices/brandsSlice";
import { getApiBaseUrl } from "../../utils/apiConfig";
import { getProductImageUrl } from "../../utils/productImages";
// Colors are provided via ThemeContext; avoid importing Colors directly here
import InfoDialog from "../../components/InfoDialog";
import HomeHeader from "../../components/HomeHeader";
import BannerSlider from "../../components/BannerSlider";
import DiscountProductSlider from "../../components/DiscountProductSlider";
import { useRef } from "react";
import { Heart, Star } from "lucide-react-native";
import { toggleFavorite } from "../../services/favoriteService";
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

  // Device type detection
  const isSmallPhone = width <= 375; // iPhone SE, iPhone 12 mini
  const isMediumPhone = width > 375 && width <= 414; // iPhone XR, 11, 12, 13, 14
  const isLargePhone = width > 414; // iPhone Pro Max models, iPhone 15/16 Plus
  const language = useLanguage();
  // Responsive values
  const horizontalPadding = isSmallPhone ? 12 : isMediumPhone ? 16 : 20;
  const cardGap = isSmallPhone ? 8 : 12;

  // Calculate card width based on screen size
  const columns = isLandscape ? 3 : isLargePhone ? 3 : 2;
  const totalGapWidth = cardGap * (columns - 1);
  const cardWidth = Math.floor(
    (width - horizontalPadding * 2 - totalGapWidth) / columns,
  );

  // Responsive dimensions
  const categoryIconSize = isSmallPhone ? 20 : 24;
  const categoryCardWidth = isSmallPhone ? 70 : 80;
  const categoryIconContainerSize = isSmallPhone ? 45 : 50;

  // Wallet dimensions
  const walletPadding = isSmallPhone ? 12 : 16;
  const walletActionButtonSize = isSmallPhone ? 40 : 44;

  // Text sizes
  const sectionTitleSize = isSmallPhone ? 16 : 18;
  const productNameSize = isSmallPhone ? 12 : 13;
  const productPriceSize = isSmallPhone ? 14 : 16;
  const walletBalanceSize = isSmallPhone ? 24 : 28;

  return {
    width,
    height,
    isLandscape,
    isSmallPhone,
    isMediumPhone,
    isLargePhone,
    horizontalPadding,
    cardGap,
    cardWidth,
    categoryIconSize,
    categoryCardWidth,
    categoryIconContainerSize,
    walletPadding,
    walletActionButtonSize,
    sectionTitleSize,
    productNameSize,
    productPriceSize,
    walletBalanceSize,
  };
};

export default function Home() {
  const router = useRouter();
  const dispatch = useDispatch();
  const { t, isRTL, locale } = useLanguage();
  const { theme, toggleTheme } = useTheme();
  const layout = useResponsiveLayout();
  const API_BASE_URL = getApiBaseUrl();
  const navigationInProgress = useRef(false);

  // Helper function to get localized text
  const getLocalizedText = (product, field) => {
    // Ensure language has a default fallback
    const lang = locale;
    const localizedField = `${field}_${lang}`;
    return product[localizedField] || product[field] || "";
  };
  // Dialog state for errors/info
  const [dialog, setDialog] = useState({
    visible: false,
    title: "",
    message: "",
  });
  const closeDialog = () =>
    setDialog({ visible: false, title: "", message: "" });

  // Pull-to-refresh state
  const [refreshing, setRefreshing] = useState(false);

  // Favorites state - track which products are favorited
  const [favorites, setFavorites] = useState({});

  // Redux selectors
  const {
    items: products,
    loading: productsLoading,
    meta,
  } = useSelector((state) => state.products);
  const { items: categories, loading: categoriesLoading } = useSelector(
    (state) => state.categories,
  );
  const { items: brands, loading: brandsLoading } = useSelector(
    (state) => state.brands,
  );
  const { isAuthenticated, user } = useSelector((state) => state.auth);

  // Get parent categories (categories with no parent_id)
  const parentCategories = categories.filter((cat) => cat.parent_id === null);

  // Infinite scroll state
  const [loadingMore, setLoadingMore] = useState(false);

  const pageLimit = 10;
  const hasMore =
    typeof meta?.total === "number" ? products.length < meta.total : true;

  // Fetch data on component mount
  useEffect(() => {
    dispatch(fetchProducts({ limit: pageLimit, offset: 0 }));
    dispatch(fetchCategories({})); // Fetch all categories without limit
    dispatch(fetchBrands({ is_active: "true" })); // Fetch only active brands
  }, [dispatch]);

  const onRefresh = () => {
    setRefreshing(true);
    Promise.all([
      dispatch(fetchProducts({ limit: pageLimit, offset: 0 })),
      dispatch(fetchCategories({})), // Fetch all categories
      dispatch(fetchBrands({ is_active: "true" })), // Fetch only active brands
    ])
      .catch((error) => {
        console.error("Refresh error:", error);
        setDialog({
          visible: true,
          title: t("error") || "Error",
          message:
            t("refreshError") || "Unable to refresh data. Please try again.",
        });
      })
      .finally(() => setRefreshing(false));
  };

  const loadMoreProducts = useCallback(() => {
    if (loadingMore) return;
    if (productsLoading) return;
    if (!hasMore) return;
    if (products.length < pageLimit) return; // avoid firing before initial page is filled
    setLoadingMore(true);
    dispatch(
      fetchProducts({
        limit: pageLimit,
        offset: products.length,
        append: true,
      }),
    )
      .unwrap()
      .catch((error) => {
        console.error("Load more products error:", error);
        setDialog({
          visible: true,
          title: t("error") || "Error",
          message:
            t("loadMoreError") ||
            "Unable to load more products. Please try again.",
        });
      })
      .finally(() => setLoadingMore(false));
  }, [dispatch, loadingMore, hasMore, products.length, productsLoading]);

  const resolveCategoryImageUri = (category) => {
    const imageUrl = category?.image_url || category?.image;
    if (imageUrl) {
      return imageUrl.startsWith("http")
        ? imageUrl
        : `${API_BASE_URL}${imageUrl}`;
    }

    return "https://via.placeholder.com/400";
  };

  const resolveBrandImageUri = (brand) => {
    const imageUrl = brand?.logo_url || brand?.logo || brand?.image;
    if (imageUrl) {
      return imageUrl.startsWith("http")
        ? imageUrl
        : `${API_BASE_URL}${imageUrl}`;
    }

    return "https://via.placeholder.com/400";
  };

  const handleShareProduct = async (id, name) => {
    try {
      const userId = user?.id;
      const checkoutUrl = `https://checkout.aman-store.com/checkout?userId=${userId}&productId=${id}`;

      const result = await Share.share({
        message: `${name}\n\n${checkoutUrl}`,
        title: name,
      });

      if (result.action === Share.sharedAction) {
        if (result.activityType) {
          console.log("Shared with activity type:", result.activityType);
        } else {
          console.log("Shared successfully");
        }
      } else if (result.action === Share.dismissedAction) {
        console.log("Share dismissed");
      }
    } catch (error) {
      setDialog({
        visible: true,
        title: "Error",
        message: "Unable to share product",
      });
    }
  };

  // Handle favorite toggle
  const handleToggleFavorite = async (productId) => {
    if (!isAuthenticated) {
      setDialog({
        visible: true,
        title: t("loginRequired"),
        message: t("loginToFavorite"),
      });
      return;
    }

    try {
      // Optimistically update UI
      setFavorites((prev) => ({
        ...prev,
        [productId]: !prev[productId],
      }));

      await toggleFavorite(productId);
    } catch (error) {
      // Revert on error
      setFavorites((prev) => ({
        ...prev,
        [productId]: !prev[productId],
      }));

      setDialog({
        visible: true,
        title: t("error"),
        message: t("favoriteError"),
      });
    }
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
      <HomeHeader onToggleTheme={toggleTheme} />

      <ScrollView
        style={styles.scrollView}
        onScroll={({ nativeEvent }) => {
          const { contentSize, contentOffset, layoutMeasurement } = nativeEvent;
          const paddingToBottom = 160; // preload before exact bottom
          if (
            contentOffset.y + layoutMeasurement.height + paddingToBottom >=
            contentSize.height
          ) {
            loadMoreProducts();
          }
        }}
        scrollEventThrottle={16}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={theme.colors.primary}
            colors={[theme.colors.primary]}
          />
        }
      >
        {/* Banner Slider */}
        <BannerSlider />

        {/* Discount Products Slider */}
        <DiscountProductSlider />

        {/* Categories */}
        <View style={styles.section}>
          <View
            style={[
              styles.sectionHeader,
              { paddingHorizontal: layout.horizontalPadding },
            ]}
          >
            <Text
              style={[
                styles.sectionTitle,
                {
                  color: theme.colors.text,
                  fontSize: layout.sectionTitleSize,
                },
              ]}
            >
              {t("categories")}
            </Text>
            <TouchableOpacity onPress={() => router.push("/categories")}>
              <Text
                style={[
                  styles.seeAll,
                  {
                    color: theme.colors.primary,
                    fontSize: layout.isSmallPhone ? 13 : 14,
                  },
                ]}
              >
                {t("seeAll")}
              </Text>
            </TouchableOpacity>
          </View>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={[
              styles.categoriesScroll,
              { paddingLeft: layout.horizontalPadding },
            ]}
          >
            {categoriesLoading ? (
              <View style={{ flexDirection: "row", gap: 12 }}>
                {[1, 2, 3, 4, 5].map((i) => (
                  <View key={i} style={styles.categoryCard}>
                    <View
                      style={[
                        styles.categoryImageContainer,
                        {
                          backgroundColor: theme.colors.border,
                        },
                      ]}
                    />
                    <Text
                      style={[
                        styles.categoryText,
                        {
                          width: 60,
                          height: 10,
                          backgroundColor: theme.colors.border,
                          borderRadius: 4,
                          marginTop: 6,
                        },
                      ]}
                    />
                  </View>
                ))}
              </View>
            ) : parentCategories.length > 0 ? (
              parentCategories.map((category) => (
                <Pressable
                  key={category.id}
                  style={({ pressed }) => [
                    styles.categoryCard,
                    pressed && {
                      transform: [{ scale: 0.95 }],
                    },
                  ]}
                  onPress={() => {
                    router.push(`/products?category=${category.id}`);
                  }}
                >
                  {({ pressed }) => (
                    <View>
                      <View
                        style={[
                          styles.categoryImageContainer,
                          {
                            borderColor: theme.colors.border,
                            borderWidth: 1,
                          },
                        ]}
                      >
                        <Image
                          source={{ uri: resolveCategoryImageUri(category) }}
                          style={styles.categoryImage}
                          contentFit="cover"
                          transition={200}
                          cachePolicy="memory-disk"
                        />
                      </View>
                      <Text
                        style={[
                          styles.categoryText,
                          {
                            color: theme.colors.text,
                            fontSize: 11,
                          },
                        ]}
                      >
                        {category.name}
                      </Text>
                    </View>
                  )}
                </Pressable>
              ))
            ) : null}
          </ScrollView>
        </View>

        {/* Brands */}
        <View style={styles.section}>
          <View
            style={[
              styles.sectionHeader,
              { paddingHorizontal: layout.horizontalPadding },
            ]}
          >
            <Text
              style={[
                styles.sectionTitle,
                {
                  color: theme.colors.text,
                  fontSize: layout.sectionTitleSize,
                },
              ]}
            >
              {t("brands")}
            </Text>
            <TouchableOpacity onPress={() => router.push("/brands")}>
              <Text
                style={[
                  styles.seeAll,
                  {
                    color: theme.colors.primary,
                    fontSize: layout.isSmallPhone ? 13 : 14,
                  },
                ]}
              >
                {t("seeAll")}
              </Text>
            </TouchableOpacity>
          </View>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={[
              styles.categoriesScroll,
              { paddingLeft: layout.horizontalPadding },
            ]}
          >
            {brandsLoading ? (
              <View style={{ flexDirection: "row", gap: 12 }}>
                {[1, 2, 3, 4, 5].map((i) => (
                  <View key={i} style={styles.categoryCard}>
                    <View
                      style={[
                        styles.categoryImageContainer,
                        {
                          backgroundColor: theme.colors.border,
                        },
                      ]}
                    />
                    <Text
                      style={[
                        styles.categoryText,
                        {
                          width: 60,
                          height: 10,
                          backgroundColor: theme.colors.border,
                          borderRadius: 4,
                          marginTop: 6,
                        },
                      ]}
                    />
                  </View>
                ))}
              </View>
            ) : brands.length > 0 ? (
              brands.map((brand) => (
                <Pressable
                  key={brand.id}
                  style={({ pressed }) => [
                    styles.categoryCard,
                    pressed && {
                      transform: [{ scale: 0.95 }],
                    },
                  ]}
                  onPress={() => {
                    router.push(`/products?brand=${brand.id}`);
                  }}
                >
                  {({ pressed }) => (
                    <View>
                      <View
                        style={[
                          styles.categoryImageContainer,
                          {
                            borderColor: theme.colors.border,
                            borderWidth: 1,
                          },
                        ]}
                      >
                        <Image
                          source={{ uri: resolveBrandImageUri(brand) }}
                          style={styles.categoryImage}
                          contentFit="cover"
                          transition={200}
                          cachePolicy="memory-disk"
                        />
                      </View>
                      <Text
                        style={[
                          styles.categoryText,
                          {
                            color: theme.colors.text,
                            fontSize: 11,
                          },
                        ]}
                      >
                        {brand.name}
                      </Text>
                    </View>
                  )}
                </Pressable>
              ))
            ) : null}
          </ScrollView>
        </View>

        {/* Recently Added (last 3 days) — moved after Categories */}
        {(() => {
          const threeDaysAgo = new Date();
          threeDaysAgo.setDate(threeDaysAgo.getDate() - 3);
          const withDates = (products || []).filter((p) => !!p?.created_at);
          const sortedByDateDesc = withDates.sort((a, b) => {
            const da = new Date(a.created_at).getTime();
            const db = new Date(b.created_at).getTime();
            return db - da;
          });
          const recentOnly = sortedByDateDesc.filter((p) => {
            const d = new Date(p.created_at);
            return !isNaN(d) && d >= threeDaysAgo;
          });
          const recentProducts =
            recentOnly.length > 0 ? recentOnly : sortedByDateDesc.slice(0, 10);
          return recentProducts.length > 0 ? (
            <View style={styles.section}>
              <View
                style={[
                  styles.sectionHeader,
                  { paddingHorizontal: layout.horizontalPadding },
                ]}
              >
                <Text
                  style={[
                    styles.sectionTitle,
                    {
                      color: theme.colors.text,
                      fontSize: layout.sectionTitleSize,
                    },
                  ]}
                >
                  {t("recentlyAdded")}
                </Text>
              </View>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                style={{ paddingLeft: layout.horizontalPadding }}
                contentContainerStyle={{
                  paddingRight: layout.horizontalPadding,
                }}
              >
                {recentProducts.map((product) => (
                  <Pressable
                    key={product.id}
                    style={({ pressed }) => [
                      styles.recentCard,
                      { backgroundColor: theme.colors.card },
                      pressed && styles.productCardPressed,
                    ]}
                    onPress={() => {
                      if (!navigationInProgress.current) {
                        navigationInProgress.current = true;
                        router.push(`/product/${product.id}`);
                        setTimeout(() => {
                          navigationInProgress.current = false;
                        }, 500);
                      }
                    }}
                  >
                    <View style={styles.recentImage}>
                      <Image
                        source={{
                          uri: getProductImageUrl(
                            product,
                            "https://via.placeholder.com/400",
                          ),
                        }}
                        style={{ width: "100%", height: "100%" }}
                        contentFit="cover"
                        transition={200}
                        cachePolicy="memory-disk"
                      />
                    </View>
                    <View style={styles.recentInfo}>
                      <Text
                        numberOfLines={1}
                        style={{
                          color: theme.colors.text,
                          fontSize: layout.isSmallPhone ? 12 : 13,
                        }}
                      >
                        {getLocalizedText(product, "name")}
                      </Text>
                      <Text
                        style={{
                          color: theme.colors.primary,
                          fontSize: layout.isSmallPhone ? 13 : 14,
                        }}
                      >
                        {isRTL
                          ? `${product.sell_price} دینار `
                          : `${product.sell_price} IQD`}
                      </Text>
                    </View>
                  </Pressable>
                ))}
              </ScrollView>
            </View>
          ) : null;
        })()}

        {/* Featured Products */}
        <View style={styles.section}>
          <View
            style={[
              styles.sectionHeader,
              { paddingHorizontal: layout.horizontalPadding },
            ]}
          >
            <Text
              style={[
                styles.sectionTitle,
                {
                  color: theme.colors.text,
                  fontSize: layout.sectionTitleSize,
                },
              ]}
            >
              {t("featuredProducts")}
            </Text>
            <TouchableOpacity onPress={() => router.push("/products")}>
              <Text
                style={[
                  styles.seeAll,
                  {
                    color: theme.colors.primary,
                    fontSize: layout.isSmallPhone ? 13 : 14,
                  },
                ]}
              >
                {t("seeAll")}
              </Text>
            </TouchableOpacity>
          </View>
          <View
            style={[
              styles.productsGrid,
              {
                flexDirection: isRTL ? "row-reverse" : "row",
                paddingHorizontal: layout.horizontalPadding,
                gap: layout.cardGap,
              },
            ]}
          >
            {productsLoading && products.length === 0 ? (
              <>
                {[1, 2, 3, 4].map((i) => (
                  <View
                    key={i}
                    style={[
                      styles.productCard,
                      {
                        backgroundColor: theme.colors.card,
                        width: layout.cardWidth,
                        borderColor: theme.colors.border,
                        borderWidth: StyleSheet.hairlineWidth,
                      },
                    ]}
                  >
                    <View
                      style={[
                        styles.productImage,
                        {
                          height: layout.isSmallPhone
                            ? 100
                            : layout.isMediumPhone
                              ? 110
                              : 120,
                          backgroundColor: theme.colors.border,
                        },
                      ]}
                    />
                    <View style={styles.productInfo}>
                      <View
                        style={{
                          width: "100%",
                          height: 14,
                          backgroundColor: theme.colors.border,
                          borderRadius: 4,
                          marginBottom: 8,
                        }}
                      />
                      <View
                        style={{
                          width: "60%",
                          height: 12,
                          backgroundColor: theme.colors.border,
                          borderRadius: 4,
                          marginBottom: 8,
                        }}
                      />
                      <View style={styles.bottomRow}>
                        <View
                          style={{
                            width: 60,
                            height: 16,
                            backgroundColor: theme.colors.border,
                            borderRadius: 4,
                          }}
                        />
                        <View
                          style={{
                            width: layout.isSmallPhone ? 32 : 36,
                            height: layout.isSmallPhone ? 32 : 36,
                            borderRadius: layout.isSmallPhone ? 16 : 18,
                            backgroundColor: theme.colors.border,
                          }}
                        />
                      </View>
                    </View>
                  </View>
                ))}
              </>
            ) : products.length > 0 ? (
              products.map((product) => (
                <Pressable
                  key={product.id}
                  style={({ pressed }) => [
                    styles.productCard,
                    {
                      backgroundColor: theme.colors.card,
                      width: layout.cardWidth,
                    },
                    pressed && styles.productCardPressed,
                  ]}
                  onPress={() => {
                    if (!navigationInProgress.current) {
                      navigationInProgress.current = true;
                      router.push(`/product/${product.id}`);
                      setTimeout(() => {
                        navigationInProgress.current = false;
                      }, 500);
                    }
                  }}
                >
                  {/* Image at top */}
                  <View
                    style={[
                      styles.productImage,
                      {
                        height: layout.cardWidth * 0.75,
                      },
                    ]}
                  >
                    <Image
                      source={{
                        uri: getProductImageUrl(
                          product,
                          "https://via.placeholder.com/400",
                        ),
                      }}
                      style={styles.productImageImg}
                      contentFit="cover"
                      transition={200}
                      cachePolicy="memory-disk"
                    />
                    {/* Commission Badge */}
                    {product.commission_price && (
                      <View
                        style={[styles.bonusTag, { backgroundColor: "green" }]}
                      >
                        <Text style={styles.bonusTagText}>
                          {isRTL
                            ? `${product.commission_price} دینار `
                            : `${product.commission_price} IQD`}
                        </Text>
                      </View>
                    )}
                    {/* Favorite Button */}
                    <TouchableOpacity
                      style={[
                        styles.favoriteButton,
                        {
                          backgroundColor: theme.colors.card,
                        },
                      ]}
                      onPress={(e) => {
                        e.stopPropagation();
                        handleToggleFavorite(product.id);
                      }}
                    >
                      <Heart
                        size={16}
                        color={
                          favorites[product.id] ? "#EF4444" : theme.colors.text
                        }
                        fill={favorites[product.id] ? "#EF4444" : "none"}
                        strokeWidth={2}
                      />
                    </TouchableOpacity>
                  </View>

                  {/* Product info section */}
                  <View style={styles.productInfo}>
                    {/* Name */}
                    <Text
                      numberOfLines={2}
                      style={[
                        styles.productName,
                        {
                          color: theme.colors.text,
                          fontSize: layout.productNameSize,
                          minHeight: 32,
                        },
                      ]}
                    >
                      {getLocalizedText(product, "name")}
                    </Text>

                    {/* Rating */}
                    {product.average_rating && product.average_rating > 0 && (
                      <View style={styles.ratingRow}>
                        <Star size={14} color="#FFA500" fill="#FFA500" />
                        <Text
                          style={[
                            styles.rating,
                            { color: theme.colors.textSecondary },
                          ]}
                        >
                          {product.average_rating.toFixed(1)}
                        </Text>
                        {product.review_count > 0 && (
                          <Text
                            style={[
                              styles.reviewCount,
                              { color: theme.colors.textSecondary },
                            ]}
                          >
                            ({product.review_count})
                          </Text>
                        )}
                      </View>
                    )}

                    {/* Price and Share at bottom */}
                    <View style={styles.bottomRow}>
                      <Text
                        style={[
                          styles.productPrice,
                          {
                            color: theme.colors.primary,
                            fontSize: layout.productPriceSize,
                          },
                        ]}
                      >
                        {isRTL
                          ? `${product.sell_price} دینار `
                          : `${product.sell_price} IQD`}
                      </Text>
                      <TouchableOpacity
                        style={[
                          styles.shareButton,
                          {
                            backgroundColor: theme.colors.primary,
                            width: layout.isSmallPhone ? 32 : 36,
                            height: layout.isSmallPhone ? 32 : 36,
                            borderRadius: layout.isSmallPhone ? 16 : 18,
                          },
                        ]}
                        onPress={(e) => {
                          e.stopPropagation();
                          handleShareProduct(
                            product.id,
                            getLocalizedText(product, "name"),
                          );
                        }}
                      >
                        <Ionicons
                          name="share-outline"
                          size={layout.isSmallPhone ? 16 : 18}
                          color="#fff"
                        />
                      </TouchableOpacity>
                    </View>
                  </View>
                </Pressable>
              ))
            ) : null}
          </View>
          {/* Loading more indicator */}
          {loadingMore && (
            <View
              style={{
                paddingVertical: 12,
                alignItems: "center",
              }}
            >
              <Text style={{ color: theme.colors.textSecondary }}>
                {t("loadingMore")}...
              </Text>
            </View>
          )}
          {!hasMore && products.length > 0 && (
            <View style={{ paddingVertical: 8, alignItems: "center" }}>
              <Text style={{ color: theme.colors.textSecondary }}>
                {t("noMoreItems")}
              </Text>
            </View>
          )}
        </View>
        <InfoDialog
          visible={dialog.visible}
          title={dialog.title}
          message={dialog.message}
          onClose={closeDialog}
        />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f5f5f5",
  },
  containerDark: {
    backgroundColor: "#1a1a1a",
  },
  scrollView: {
    flex: 1,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 20,
    backgroundColor: "#fff",
  },
  headerDark: {
    backgroundColor: "#2a2a2a",
  },
  greeting: {
    fontSize: 14,
    color: "#666",
  },
  username: {
    fontSize: 20,
    color: "#1a1a1a",
  },
  textDark: {
    color: "#fff",
  },
  headerActions: {
    flexDirection: "row",
    gap: 8,
  },
  headerButton: {
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: "#f5f5f5",
    justifyContent: "center",
    alignItems: "center",
    // Best shadow for button

    elevation: 4,
  },
  headerButtonDark: {
    backgroundColor: "#3a3a3a",
  },
  notificationButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#f5f5f5",
    justifyContent: "center",
    alignItems: "center",
  },
  banner: {
    backgroundColor: "#4a90e2",
    margin: 20,
    padding: 20,
    borderRadius: 12,
    // Best shadow for banner

    elevation: 8,
  },
  bannerTitle: {
    fontSize: 24,
    color: "#fff",
    marginBottom: 8,
  },
  bannerText: {
    fontSize: 16,
    color: "#fff",
    marginBottom: 16,
  },
  bannerButton: {
    backgroundColor: "#fff",
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 8,
    alignSelf: "flex-start",
    // Best shadow for button
    elevation: 4,
  },
  bannerButtonText: {
    color: "#4a90e2",
  },
  section: {
    marginBottom: 28,
  },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    letterSpacing: -0.3,
    color: "#1a1a1a",
  },
  seeAll: {
    color: "#4a90e2",
    fontSize: 14,
  },
  categoriesScroll: {
    // paddingLeft handled inline with responsive layout
  },
  categoryCard: {
    alignItems: "center",
    marginRight: 14,
    width: 75,
  },
  categoryImageContainer: {
    width: 75,
    height: 75,
    borderRadius: 16,
    overflow: "hidden",
    backgroundColor: "#f5f5f5",
    marginBottom: 8,
    borderWidth: 0.4,
    borderColor: "transparent",
  },
  categoryImage: {
    width: "100%",
    height: "100%",
  },
  categoryIcon: {
    // width and height handled inline with responsive layout
    borderRadius: 14,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 8,
    elevation: 1,
  },
  categoryText: {
    fontSize: 11,
    color: "#1a1a1a",
    textAlign: "center",
    marginTop: 2,
  },
  productsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "flex-start",
    // paddingHorizontal and gap handled inline with responsive layout
  },
  productCard: {
    // width handled inline with responsive layout
    backgroundColor: "#fff",
    borderRadius: 16,
    overflow: "hidden",
    marginBottom: 8,
    position: "relative",
    borderColor: "transparent",
  },
  productCardPressed: {
    // Lift effect on press
    transform: [{ scale: 0.97 }],
    elevation: 1,
    shadowOpacity: 0.02,
  },
  productImage: {
    width: "100%",
    // height handled inline with responsive layout
    backgroundColor: "#f9f9f9",
    overflow: "hidden",
    justifyContent: "center",
    alignItems: "center",
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
  },
  bonusTag: {
    position: "absolute",
    top: 8,
    left: 8,
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 10,
    elevation: 4,
  },
  bonusTagText: {
    color: "#fff",
    fontSize: 8,
  },
  favoriteButton: {
    position: "absolute",
    top: 8,
    right: 8,
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  productImageImg: {
    width: "100%",
    height: "100%",
  },
  productInfo: {
    padding: 10,
    flex: 1,
    justifyContent: "space-between",
  },
  productName: {
    fontSize: 13,
    color: "#1a1a1a",
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
    fontWeight: "500",
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
  productPrice: {
    fontSize: 16,
    color: "#1a1a1a",
  },
  ratingContainer: {
    flexDirection: "row",
    alignItems: "center",
    flexShrink: 1,
  },
  ratingText: {
    fontSize: 12,
    color: "#666",
    marginLeft: 4,
    flexShrink: 1,
  },
  starsRow: {
    flexDirection: "row",
  },
  shareButton: {
    // width, height, and borderRadius handled inline with responsive layout
    backgroundColor: "#4a90e2",
    justifyContent: "center",
    alignItems: "center",
    elevation: 2,
  },
  noDataText: {
    fontSize: 16,
    textAlign: "center",
    marginTop: 20,
    width: "100%",
  },
  recentCard: {
    width: 120,
    borderRadius: 12,
    overflow: "hidden",
    marginRight: 10,
  },
  recentImage: {
    width: "100%",
    height: 90,
    backgroundColor: "#f5f5f5",
  },
  recentInfo: {
    padding: 8,
    gap: 4,
  },
});
