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
import SectionBanner from "../../components/SectionBanner";
import { useRef } from "react";
import { Heart, Star } from "lucide-react-native";
import { toggleFavorite } from "../../services/favoriteService";
import TrendingProductSlider from "@/components/TrendingProductSlider";
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
  const isMediumPhone = width > 375 && width <= 414;
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

  // Helper function to get localized category name
  const getLocalizedCategoryName = (category) => {
    const lang = locale || "en";
    return category[`name_${lang}`] || category.name || "";
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

  // Horizontal slider products state
  const [horizontalProducts, setHorizontalProducts] = useState([]);
  const [horizontalLoading, setHorizontalLoading] = useState(false);
  const [canLoadMoreHorizontal, setCanLoadMoreHorizontal] = useState(true);
  const horizontalLimit = 10;

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
    loadHorizontalProducts(); // Load initial horizontal products
  }, [dispatch]);

  const loadHorizontalProducts = useCallback(() => {
    if (horizontalLoading || !canLoadMoreHorizontal) return;
    setHorizontalLoading(true);
    setCanLoadMoreHorizontal(false);
    dispatch(
      fetchProducts({
        limit: 100, // Fetch more to have a good pool for randomization
        offset: 0,
      }),
    )
      .then((response) => {
        // Handle both unwrapped and wrapped responses
        const allProducts = response.payload?.data || response.payload || [];
        if (allProducts.length > 0) {
          const shuffled = [...allProducts].sort(() => Math.random() - 0.5);
          const randomProducts = shuffled.slice(0, horizontalLimit);
          // Filter out products that are already in the list
          setHorizontalProducts((prev) => {
            const existingIds = new Set(prev.map((p) => p.id));
            const newProducts = randomProducts.filter(
              (p) => !existingIds.has(p.id),
            );
            return [...prev, ...newProducts];
          });
        } else {
          // Fallback to using existing products from state
          if (products.length > 0) {
            const shuffled = [...products].sort(() => Math.random() - 0.5);
            const randomProducts = shuffled.slice(0, horizontalLimit);
            setHorizontalProducts((prev) => {
              const existingIds = new Set(prev.map((p) => p.id));
              const newProducts = randomProducts.filter(
                (p) => !existingIds.has(p.id),
              );
              return [...prev, ...newProducts];
            });
          }
        }
        // Re-enable loading after a short delay
        setTimeout(() => setCanLoadMoreHorizontal(true), 1000);
      })
      .catch((error) => {
        console.error("Load horizontal products error:", error);
        // On error, use existing products from state
        if (products.length > 0) {
          const shuffled = [...products].sort(() => Math.random() - 0.5);
          const randomProducts = shuffled.slice(0, horizontalLimit);
          setHorizontalProducts((prev) => {
            const existingIds = new Set(prev.map((p) => p.id));
            const newProducts = randomProducts.filter(
              (p) => !existingIds.has(p.id),
            );
            return [...prev, ...newProducts];
          });
        }
        setTimeout(() => setCanLoadMoreHorizontal(true), 1000);
      })
      .finally(() => setHorizontalLoading(false));
  }, [dispatch, horizontalLoading, products, canLoadMoreHorizontal]);

  const onRefresh = () => {
    setRefreshing(true);
    setHorizontalProducts([]);
    setCanLoadMoreHorizontal(true);
    Promise.all([
      dispatch(fetchProducts({ limit: pageLimit, offset: 0 })),
      dispatch(fetchCategories({})), // Fetch all categories
      dispatch(fetchBrands({ is_active: "true" })), // Fetch only active brands
    ])
      .then(() => {
        loadHorizontalProducts();
      })
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
      if (imageUrl.startsWith("http")) {
        return imageUrl;
      }
      // Ensure proper URL formatting
      const cleanUrl = imageUrl.startsWith("/") ? imageUrl : `/${imageUrl}`;
      return `${API_BASE_URL}${cleanUrl}`;
    }
    return "https://via.placeholder.com/400";
  };

  const resolveBrandImageUri = (brand) => {
    const imageUrl = brand?.logo_url || brand?.logo || brand?.image;
    if (imageUrl) {
      if (imageUrl.startsWith("http")) {
        return imageUrl;
      }
      // Ensure proper URL formatting
      const cleanUrl = imageUrl.startsWith("/") ? imageUrl : `/${imageUrl}`;
      return `${API_BASE_URL}${cleanUrl}`;
    }
    return "https://via.placeholder.com/400";
  };

  const navigateToFilteredProducts = useCallback(
    (filterKey, filterValue) => {
      if (navigationInProgress.current) return;

      navigationInProgress.current = true;
      router.push(`/products?${filterKey}=${filterValue}`);

      setTimeout(() => {
        navigationInProgress.current = false;
      }, 350);
    },
    [router],
  );

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

        {/* Categories - 2 Row Layout */}
        <SectionBanner type="categories" resizeMode="stretch" style={[styles.section, styles.categoriesSection]} route="/categories">
          <View style={styles.sectionBackdrop}>
            <View style={[styles.decorativeCircle, styles.decorativeCircle1]} />
            <View style={[styles.decorativeCircle, styles.decorativeCircle2]} />
          </View>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={[
              styles.categoriesScroll,
              { paddingLeft: layout.horizontalPadding ,marginTop:70 },
            ]}
            contentContainerStyle={{ paddingRight: layout.horizontalPadding }}
          >
            {categoriesLoading ? (
              <View style={{ flexDirection: "column", gap: 12 }}>
                <View style={{ flexDirection: "row", gap: 12 }}>
                  {[1, 2, 3, 4].map((i) => (
                    <View key={i} style={styles.categoryCard2Row}>
                      <View
                        style={[
                          styles.categoryImageContainer2Row,
                          {
                            backgroundColor: theme.colors.border,
                          },
                        ]}
                      />
                    </View>
                  ))}
                </View>
                <View style={{ flexDirection: "row", gap: 12 }}>
                  {[5, 6, 7, 8].map((i) => (
                    <View key={i} style={styles.categoryCard2Row}>
                      <View
                        style={[
                          styles.categoryImageContainer2Row,
                          {
                            backgroundColor: theme.colors.border,
                          },
                        ]}
                      />
                    </View>
                  ))}
                </View>
              </View>
            ) : parentCategories.length > 0 ? (
              <View style={{ flexDirection: "column", gap: 10 }}>
                {/* First Row */}
                <View style={{ flexDirection: "row", gap: 12 }}>
                  {parentCategories
                    .filter((_, idx) => idx % 2 === 0)
                    .map((category) => (
                      <Pressable
                        key={category.id}
                        style={({ pressed }) => [
                          styles.categoryCard2Row,
                          {
                            backgroundColor: theme.colors.card,
                            borderColor: theme.colors.border,
                          },
                          pressed && {
                            transform: [{ scale: 0.95 }],
                            opacity: 0.8,
                          },
                        ]}
                        onPress={() => {
                          navigateToFilteredProducts("category", category.id);
                        }}
                      >
                        <View
                          style={[
                            styles.categoryImageContainer2Row,
                            {
                              backgroundColor: theme.colors.primary + "10",
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
                      </Pressable>
                    ))}
                </View>
                {/* Second Row */}
                <View style={{ flexDirection: "row", gap: 12 }}>
                  {parentCategories
                    .filter((_, idx) => idx % 2 === 1)
                    .map((category) => (
                      <Pressable
                        key={category.id}
                        style={({ pressed }) => [
                          styles.categoryCard2Row,
                          {
                            backgroundColor: theme.colors.card,
                            borderColor: theme.colors.border,
                          },
                          pressed && {
                            transform: [{ scale: 0.95 }],
                            opacity: 0.8,
                          },
                        ]}
                        onPress={() => {
                          navigateToFilteredProducts("category", category.id);
                        }}
                      >
                        <View
                          style={[
                            styles.categoryImageContainer2Row,
                            {
                              backgroundColor: theme.colors.primary + "10",
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
                      </Pressable>
                    ))}
                </View>
              </View>
            ) : null}
          </ScrollView>
        </SectionBanner>

        {/* Brands - 2 Row Layout */}
        <SectionBanner type="brands" resizeMode="stretch" style={[styles.section, styles.brandsSection]} route="/brands">
          <View style={styles.sectionBackdrop}>
            <View style={[styles.decorativeCircle, styles.decorativeCircle3]} />
            <View style={[styles.decorativeCircle, styles.decorativeCircle4]} />
          </View>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={[
              styles.categoriesScroll,
              { paddingLeft: layout.horizontalPadding ,marginTop:70},
            ]}
            contentContainerStyle={{ paddingRight: layout.horizontalPadding }}
          >
            {brandsLoading ? (
              <View style={{ flexDirection: "column", gap: 12 }}>
                <View style={{ flexDirection: "row", gap: 12 }}>
                  {[1, 2, 3, 4].map((i) => (
                    <View key={i} style={styles.categoryCard2Row}>
                      <View
                        style={[
                          styles.categoryImageContainer2Row,
                          {
                            backgroundColor: theme.colors.border,
                          },
                        ]}
                      />
                    </View>
                  ))}
                </View>
                <View style={{ flexDirection: "row", gap: 12 }}>
                  {[5, 6, 7, 8].map((i) => (
                    <View key={i} style={styles.categoryCard2Row}>
                      <View
                        style={[
                          styles.categoryImageContainer2Row,
                          {
                            backgroundColor: theme.colors.border,
                          },
                        ]}
                      />
                    </View>
                  ))}
                </View>
              </View>
            ) : brands.length > 0 ? (
              <View style={{ flexDirection: "column", gap: 10 }}>
                {/* First Row */}
                <View style={{ flexDirection: "row", gap: 12 }}>
                  {brands
                    .filter((_, idx) => idx % 2 === 0)
                    .map((brand) => (
                      <Pressable
                        key={brand.id}
                        style={({ pressed }) => [
                          styles.categoryCard2Row,
                          {
                            backgroundColor: theme.colors.card,
                            borderColor: theme.colors.border,
                          },
                          pressed && {
                            transform: [{ scale: 0.95 }],
                            opacity: 0.8,
                          },
                        ]}
                        onPress={() => {
                          navigateToFilteredProducts("brand", brand.id);
                        }}
                      >
                        <View
                          style={[
                            styles.categoryImageContainer2Row,
                            {
                              backgroundColor: theme.colors.primary + "10",
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
                      </Pressable>
                    ))}
                </View>
                {/* Second Row */}
                <View style={{ flexDirection: "row", gap: 12 }}>
                  {brands
                    .filter((_, idx) => idx % 2 === 1)
                    .map((brand) => (
                      <Pressable
                        key={brand.id}
                        style={({ pressed }) => [
                          styles.categoryCard2Row,
                          {
                            backgroundColor: theme.colors.card,
                            borderColor: theme.colors.border,
                          },
                          pressed && {
                            transform: [{ scale: 0.95 }],
                            opacity: 0.8,
                          },
                        ]}
                        onPress={() => {
                          navigateToFilteredProducts("brand", brand.id);
                        }}
                      >
                        <View
                          style={[
                            styles.categoryImageContainer2Row,
                            {
                              backgroundColor: theme.colors.primary + "10",
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
                      </Pressable>
                    ))}
                </View>
              </View>
            ) : null}
          </ScrollView>
        </SectionBanner>

        {/* Horizontal Product Slider */}
        <TrendingProductSlider />

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
            recentOnly.length > 0 ? recentOnly : sortedByDateDesc.slice(0, 20);
          return recentProducts.length > 0 ? (
            <SectionBanner type="additions" resizeMode="stretch" style={[styles.section, styles.recentSection]} route="/products">
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                style={{ paddingLeft: layout.horizontalPadding }}
                contentContainerStyle={{
                  paddingRight: layout.horizontalPadding,
                  gap: 12,
                  marginTop: 70,
                }}
              >
                {recentProducts.map((product) => (
                  <Pressable
                    key={product.id}
                    style={({ pressed }) => [
                      styles.recentCard,
                      { backgroundColor: theme.colors.card },
                      pressed && {
                        transform: [{ scale: 0.97 }],
                        opacity: 0.9,
                      },
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
                      {/* NEW Badge */}
                      <View style={styles.recentBadge}>
                        <Ionicons name="sparkles" size={10} color="#fff" />
                        <Text style={styles.recentBadgeText}>NEW</Text>
                      </View>
                      {/* Quick Add to Cart Button */}
                      <TouchableOpacity
                        style={styles.quickAddButton}
                        onPress={(e) => {
                          e.stopPropagation();
                          handleToggleFavorite(product.id);
                        }}
                      >
                        <Heart
                          size={14}
                          color={favorites[product.id] ? "#FF6B6B" : "#fff"}
                          fill={favorites[product.id] ? "#FF6B6B" : "none"}
                          strokeWidth={2}
                        />
                      </TouchableOpacity>
                    </View>
                    <View style={styles.recentInfo}>
                      <Text
                        numberOfLines={2}
                        style={[
                          styles.recentProductName,
                          {
                            color: theme.colors.text,
                            fontSize: layout.isSmallPhone ? 12 : 13,
                          },
                        ]}
                      >
                        {getLocalizedText(product, "name")}
                      </Text>
                      <View style={styles.recentPriceRow}>
                        <Text
                          style={[
                            styles.recentPrice,
                            {
                              color: theme.colors.primary,
                              fontSize: layout.isSmallPhone ? 14 : 15,
                            },
                          ]}
                        >
                          {isRTL
                            ? `${product.sell_price} دینار `
                            : `${product.sell_price} IQD`}
                        </Text>
                        {product.average_rating &&
                          product.average_rating > 0 && (
                            <View style={styles.recentRating}>
                              <Star size={12} color="#FFA500" fill="#FFA500" />
                              <Text style={styles.recentRatingText}>
                                {product.average_rating.toFixed(1)}
                              </Text>
                            </View>
                          )}
                      </View>
                    </View>
                  </Pressable>
                ))}
              </ScrollView>
            </SectionBanner>
          ) : null;
        })()}

        {/* Featured Products */}
        <SectionBanner
          type="special"
          resizeMode="none"
          style={[
            styles.section,
            { backgroundColor: "transparent", paddingVertical: 10 },
          ]}
          route="/products"
        >
          <View
            style={[
              styles.productsGrid,
              {
                flexDirection: isRTL ? "row-reverse" : "row",
                paddingHorizontal: layout.horizontalPadding,
                marginTop:70,
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
        </SectionBanner>
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
    backgroundColor: "#FFFFFF",
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
  },
  categoriesSection: {
    paddingVertical: 10,
    paddingBottom: 10,
    marginBottom: 0,
    borderRadius: 0,
    backgroundColor: "#FAFAFA",
    position: "relative",
    overflow: "hidden",
  },
  middleBannerSection: {
    marginVertical: 0,
    paddingVertical: 16,
    backgroundColor: "#FFFFFF",
  },
  brandsSection: {
    paddingVertical: 10,
    paddingBottom: 10,
    marginBottom: 0,
    borderRadius: 0,
    backgroundColor: "#F5F5F5",
    position: "relative",
    overflow: "hidden",
  },
  recentSection: {
    paddingVertical: 10,
    paddingBottom: 10,
    marginBottom: 0,
    backgroundColor: "#FFFFFF",
  },
  horizontalProductsSection: {
    paddingVertical: 20,
    paddingBottom: 24,
    marginBottom: 0,
    backgroundColor: "#FAFAFA",
  },
  horizontalProductCard: {
    width: 180,
    borderRadius: 20,
    overflow: "hidden",
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "#e9ecef",
  },
  horizontalProductImage: {
    width: "100%",
    height: 160,
    backgroundColor: "#f5f5f5",
    position: "relative",
  },
  horizontalProductInfo: {
    padding: 12,
    gap: 6,
  },
  horizontalProductName: {
    lineHeight: 16,
    minHeight: 32,
  },
  horizontalProductPriceRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 4,
  },
  horizontalProductPrice: {},
  loadMoreCard: {
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 0,
    alignSelf: "center",
  },
  horizontalLoadingCard: {
    width: 80,
    height: 200,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "transparent",
  },
  sectionBackdrop: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 0,
  },
  decorativeCircle: {
    position: "absolute",
    borderRadius: 1000,
    opacity: 0.03,
  },
  decorativeCircle1: {
    width: 200,
    height: 200,
    backgroundColor: "#000000",
    top: -100,
    right: -50,
  },
  decorativeCircle2: {
    width: 150,
    height: 150,
    backgroundColor: "#000000",
    bottom: -75,
    left: -75,
  },
  decorativeCircle3: {
    width: 180,
    height: 180,
    backgroundColor: "#000000",
    top: -90,
    left: -60,
  },
  decorativeCircle4: {
    width: 160,
    height: 160,
    backgroundColor: "#000000",
    bottom: -80,
    right: -80,
  },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
    zIndex: 1,
  },
  sectionTitleContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  titleAccent: {
    width: 4,
    height: 24,
    backgroundColor: "#4a90e2",
    borderRadius: 2,
  },
  sectionTitle: {
    fontSize: 18,
    letterSpacing: -0.3,
    color: "#1a1a1a",
  },
  seeAllButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
  },
  seeAll: {
    color: "#4a90e2",
    fontSize: 14,
  },
  newBadge: {
    backgroundColor: "#4CAF50",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
    marginLeft: 8,
  },
  newBadgeText: {
    color: "#fff",
    fontSize: 10,
    letterSpacing: 0.5,
  },
  categoriesScroll: {
    // paddingLeft handled inline with responsive layout
    zIndex: 1,
  },
  categoryCard: {
    alignItems: "center",
    marginRight: 14,
    width: 75,
  },
  categoryImageContainer: {
    width: 75,
    height: 75,
    borderRadius: 20,
    overflow: "hidden",
    backgroundColor: "#f5f5f5",
  },
  categoryCard2Row: {
    alignItems: "center",
    borderRadius:15,
    backgroundColor: "#fff",
  },
  categoryImageContainer2Row: {
    width: 80,
    height: 80,
    borderRadius: 15,
    overflow: "hidden",
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#f0f4f8",
    borderWidth: 3,
    borderColor: "#fff",
  },
  categoryText2Row: {
    fontSize: 11,
    textAlign: "center",
    width: "100%",
    color: "#2c3e50",
  },
  categoryImage: {
    width: "100%",
    height: "100%",
  },
  categoryIcon: {
    // width and height handled inline with responsive layout
    borderRadius: 8,
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
    borderRadius: 20,
    overflow: "hidden",
    marginBottom: 12,
    position: "relative",
    borderColor: "#e9ecef",
    borderWidth: 1,
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
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
  },
  bonusTag: {
    position: "absolute",
    top: 10,
    left: 10,
    paddingVertical: 5,
    paddingHorizontal: 10,
    borderRadius: 12,
  },
  bonusTagText: {
    color: "#fff",
    fontSize: 8,
  },
  favoriteButton: {
    position: "absolute",
    top: 10,
    right: 10,
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: "center",
    alignItems: "center",
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
    width: 140,
    borderRadius: 12,
    overflow: "hidden",
    marginRight: 0,
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "#e9ecef",
  },
  recentImage: {
    width: "100%",
    height: 120,
    backgroundColor: "#f5f5f5",
    position: "relative",
  },
  recentBadge: {
    position: "absolute",
    top: 6,
    left: 6,
    backgroundColor: "#4CAF50",
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 8,
  },
  recentBadgeText: {
    color: "#fff",
    fontSize: 8,
    letterSpacing: 0.3,
  },
  quickAddButton: {
    position: "absolute",
    bottom: 6,
    right: 6,
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "center",
    alignItems: "center",
  },
  recentInfo: {
    padding: 8,
    gap: 4,
  },
  recentProductName: {
    lineHeight: 14,
    minHeight: 28,
  },
  recentPriceRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 2,
  },
  recentPrice: {
    fontSize: 13,
  },
  recentRating: {
    flexDirection: "row",
    alignItems: "center",
    gap: 2,
  },
  recentRatingText: {
    fontSize: 10,
    color: "#666",
  },
});
