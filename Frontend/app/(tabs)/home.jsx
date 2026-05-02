import React, { useState, useEffect, useCallback, useMemo, useRef } from "react";
import {
  View,
  StyleSheet,
  ScrollView,
  RefreshControl,
  TouchableOpacity,
  Pressable,
  Text as RNText,
  Share,
} from "react-native";
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useFocusEffect } from "@react-navigation/native";
import { useDispatch, useSelector } from "react-redux";
import { useLanguage } from "../../utils/LanguageContext";
import { useTheme } from "../../utils/ThemeContext";
import {
  buildProductCollectionKey,
  fetchProducts,
} from "../../store/slices/productsSlice";
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
import { Heart, Star } from "lucide-react-native";
import { toggleFavorite } from "../../services/favoriteService";
import TrendingProductSlider from "../../components/TrendingProductSlider";
import { useResponsiveLayout } from "../../utils/useResponsiveLayout";
import { buildPublicProductUrl } from "../../utils/productLinks";
import apiService from "../../services/apiService";
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

const formatCompactNumber = (value) => {
  const number = Number(value ?? 0);

  if (!Number.isFinite(number) || number <= 0) {
    return "0";
  }

  if (number >= 1000000) {
    const millions = number / 1000000;
    return `${millions >= 10 ? millions.toFixed(0) : millions.toFixed(1).replace(/\.0$/, "")}M`;
  }

  if (number >= 1000) {
    const thousands = number / 1000;
    return `${thousands >= 10 ? thousands.toFixed(0) : thousands.toFixed(1).replace(/\.0$/, "")}K`;
  }

  return String(number);
};

const DEFAULT_PRODUCT_COLLECTION_KEY = buildProductCollectionKey({});
const HERO_PREVIEW_LIMIT = 6;

export default function Home() {
  const router = useRouter();
  const dispatch = useDispatch();
  const { t, isRTL, locale } = useLanguage();
  const { theme, toggleTheme } = useTheme();
  const layout = useResponsiveLayout();
  const API_BASE_URL = getApiBaseUrl();
  const navigationInProgress = useRef(false);
  const initialFocusHandled = useRef(false);

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

  const [featuredProducts, setFeaturedProducts] = useState([]);
  const [featuredLoading, setFeaturedLoading] = useState(false);

  // Redux selectors
  const {
    items: products,
    loading: productsLoading,
    meta,
    lastCollectionKey,
  } = useSelector((state) => state.products);
  const { items: categories, loading: categoriesLoading } = useSelector(
    (state) => state.categories,
  );
  const { items: brands, loading: brandsLoading } = useSelector(
    (state) => state.brands,
  );
  const { isAuthenticated } = useSelector((state) => state.auth);

  useEffect(() => {
    if (!isAuthenticated) {
      setFavorites({});
    }
  }, [isAuthenticated]);

  // Get parent categories (categories with no parent_id)
  const parentCategories = useMemo(
    () => categories.filter((cat) => cat.parent_id === null),
    [categories],
  );

  // Infinite scroll state
  const [loadingMore, setLoadingMore] = useState(false);

  const pageLimit = 10;
  const hasMore =
    typeof meta?.total === "number" ? products.length < meta.total : true;
  const shouldLoadDefaultProducts =
    products.length === 0 ||
    lastCollectionKey !== DEFAULT_PRODUCT_COLLECTION_KEY;

  // Fetch data on component mount
  useEffect(() => {
    if (shouldLoadDefaultProducts && !productsLoading) {
      dispatch(fetchProducts({ limit: pageLimit, offset: 0 }));
    }

    if (!categories.length && !categoriesLoading) {
      dispatch(fetchCategories({}));
    }

    if (!brands.length && !brandsLoading) {
      dispatch(fetchBrands({ is_active: "true" }));
    }
  }, [
    brands.length,
    brandsLoading,
    categories.length,
    categoriesLoading,
    dispatch,
    pageLimit,
    productsLoading,
    shouldLoadDefaultProducts,
  ]);

  useFocusEffect(
    useCallback(() => {
      if (!initialFocusHandled.current) {
        initialFocusHandled.current = true;
        return undefined;
      }

      if (shouldLoadDefaultProducts && !productsLoading) {
        dispatch(fetchProducts({ limit: pageLimit, offset: 0 }));
      }

      return undefined;
    }, [dispatch, pageLimit, productsLoading, shouldLoadDefaultProducts]),
  );

  const loadFeaturedProducts = useCallback(async () => {
    setFeaturedLoading(true);

    try {
      const response = await apiService.get("/api/products", {
        params: {
          is_important: 1,
          in_stock: 1,
          limit: 24,
          offset: 0,
        },
      });

      const responseData = response?.data;
      const rawProducts = Array.isArray(responseData?.data)
        ? responseData.data
        : Array.isArray(responseData)
          ? responseData
          : [];
      const importantOnly = rawProducts.filter(
        (product) =>
          product?.is_important === true || Number(product?.is_important) === 1,
      );

      setFeaturedProducts(importantOnly);
    } catch (error) {
      const isSilentFeaturedError =
        error?.isOffline || error?.message === "Network Error";

      if (!isSilentFeaturedError) {
        console.error("Load featured products error:", error);
      }

      setFeaturedProducts([]);
    } finally {
      setFeaturedLoading(false);
    }
  }, []);

  useEffect(() => {
    loadFeaturedProducts();
  }, [loadFeaturedProducts]);

  const onRefresh = () => {
    setRefreshing(true);
    Promise.all([
      dispatch(fetchProducts({ limit: pageLimit, offset: 0 })),
      dispatch(fetchCategories({})), // Fetch all categories
      dispatch(fetchBrands({ is_active: "true" })), // Fetch only active brands
      loadFeaturedProducts(),
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
  }, [dispatch, loadingMore, hasMore, products.length, productsLoading, t]);

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

  const navigateToRoute = useCallback((route, delay = 350) => {
    if (navigationInProgress.current) return;

    navigationInProgress.current = true;
    router.push(route);

    setTimeout(() => {
      navigationInProgress.current = false;
    }, delay);
  }, [router]);

  const navigateToFilteredProducts = useCallback(
    (filterKey, filterValue) => {
      navigateToRoute(`/products?${filterKey}=${filterValue}`);
    },
    [navigateToRoute],
  );

  const openProduct = useCallback(
    (id) => {
      navigateToRoute(`/product/${id}`, 500);
    },
    [navigateToRoute],
  );

  const handleShareProduct = async (id, name) => {
    try {
      const productUrl = buildPublicProductUrl(id);

      const result = await Share.share({
        message: `${name}\n\n${productUrl}`,
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
    } catch (_error) {
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
      router.push("/(auth)/login");
      return;
    }

    try {
      // Optimistically update UI
      setFavorites((prev) => ({
        ...prev,
        [productId]: !prev[productId],
      }));

      await toggleFavorite(productId);
    } catch (_error) {
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

  const sectionTopInset = layout.sectionBannerOffset;
  const featuredColumns = layout.isTablet
    ? layout.getGridColumns(2, 3, 4, 5)
    : 2;
  const featuredCardWidth = layout.getCardWidth(featuredColumns, layout.cardGap);
  const featuredImageHeight = layout.isTablet
    ? Math.max(160, Math.round(featuredCardWidth * 0.82))
    : layout.isSmallPhone
      ? 100
      : layout.isMediumPhone
        ? 110
        : 120;
  const categoryGridGap = layout.isTablet ? 14 : 12;
  const categoryCardSize = layout.isTablet
    ? layout.isLandscape
      ? 118
      : layout.isSmallTablet
        ? 96
        : 108
    : 80;
  const categoryCardRadius = layout.isTablet ? 18 : 15;
  const iconColumnWidth = categoryCardSize;
  const recentCardWidth = layout.isTablet
    ? Math.min(
        Math.max(
          layout.width *
            (layout.isLandscape ? 0.24 : layout.isSmallTablet ? 0.32 : 0.28),
          210,
        ),
        layout.isLargeTablet ? 292 : 250,
      )
    : 140;
  const recentImageHeight = layout.isTablet
    ? Math.round(recentCardWidth * 0.82)
    : 120;
  const productActionButtonSize = layout.isTablet
    ? 40
    : layout.isSmallPhone
      ? 32
      : 36;
  const productActionIconSize = layout.isTablet
    ? 20
    : layout.isSmallPhone
      ? 16
      : 18;
  const categoryTileStyle = {
    width: categoryCardSize,
    height: categoryCardSize,
    borderRadius: categoryCardRadius,
  };
  const totalProductsCount =
    typeof meta?.total === "number" ? meta.total : products.length;
  const heroActionGap = layout.isTablet ? 14 : 10;
  const heroPreviewCardWidth = layout.isTablet ? 186 : 158;
  const heroPreviewProducts = useMemo(() => {
    const sourceProducts =
      featuredProducts.length > 0 ? featuredProducts : products;

    return sourceProducts.slice(0, HERO_PREVIEW_LIMIT);
  }, [featuredProducts, products]);
  const categoryPreview = parentCategories.slice(0, 12);
  const brandPreview = brands.slice(0, 12);
  const buildTwoRowColumns = (items) => {
    const columns = [];

    for (let index = 0; index < items.length; index += 2) {
      columns.push(items.slice(index, index + 2));
    }

    return columns;
  };
  const categoryColumns = buildTwoRowColumns(categoryPreview);
  const brandColumns = buildTwoRowColumns(brandPreview);
  const heroMetrics = [
    { key: "products", label: t("products"), value: totalProductsCount },
    { key: "categories", label: t("categories"), value: parentCategories.length },
    { key: "brands", label: t("brands"), value: brands.length },
  ];
  const heroActions = [
    {
      key: "search",
      label: t("search"),
      icon: "search-outline",
      route: "/search",
      accent: theme.colors.primary,
      background: theme.isDark ? "rgba(255,255,255,0.08)" : "#FFF1DF",
    },
    {
      key: "categories",
      label: t("categories"),
      icon: "grid-outline",
      route: "/categories",
      accent: "#0F766E",
      background: theme.isDark ? "rgba(16,185,129,0.16)" : "#EAFBF7",
    },
    {
      key: "brands",
      label: t("brands"),
      icon: "storefront-outline",
      route: "/brands",
      accent: theme.colors.secondary,
      background: theme.isDark ? "rgba(37,99,235,0.18)" : "#ECF3FF",
    },
    {
      key: "featured",
      label: t("featuredProducts"),
      icon: "sparkles-outline",
      route: "/products?is_important=1",
      accent: "#C2410C",
      background: theme.isDark ? "rgba(251,146,60,0.18)" : "#FFF0E6",
    },
  ];
  const renderIconTile = (item, kind) => {
    const isCategoryCard = kind === "category";
    const imageUri = isCategoryCard
      ? resolveCategoryImageUri(item)
      : resolveBrandImageUri(item);
    const accentColor = isCategoryCard
      ? theme.colors.primary
      : theme.colors.secondary;

    return (
      <Pressable
        key={`${kind}-${item.id}`}
        style={({ pressed }) => [
          styles.iconTilePressable,
          { width: iconColumnWidth },
          pressed && styles.iconTilePressed,
        ]}
        onPress={() =>
          navigateToFilteredProducts(isCategoryCard ? "category" : "brand", item.id)
        }
      >
        <View
          style={[
            styles.iconTile,
            {
              width: categoryCardSize,
              height: categoryCardSize,
              borderRadius: categoryCardRadius,
              borderColor: theme.colors.border,
              backgroundColor: theme.colors.card,
            },
          ]}
        >
          <View
            style={[
              styles.iconTileHalo,
              { backgroundColor: `${accentColor}${theme.isDark ? "24" : "16"}` },
            ]}
          />
          <View
            style={[
              styles.iconTileInner,
              categoryTileStyle,
              {
                backgroundColor: `${accentColor}${theme.isDark ? "16" : "14"}`,
                borderColor: `${accentColor}${theme.isDark ? "32" : "22"}`,
              },
            ]}
          >
            <Image
              source={{ uri: imageUri }}
              style={styles.iconTileImage}
              contentFit={isCategoryCard ? "cover" : "contain"}
              transition={180}
              cachePolicy="memory-disk"
            />
          </View>
        </View>
      </Pressable>
    );
  };

  const renderIconTileSkeleton = (key, kind) => {
    const accentColor = kind === "category"
      ? theme.colors.primary
      : theme.colors.secondary;

    return (
      <View
        key={`${kind}-skeleton-${key}`}
        style={[
          styles.iconTile,
          {
            width: categoryCardSize,
            height: categoryCardSize,
            borderRadius: categoryCardRadius,
            borderColor: theme.colors.border,
            backgroundColor: theme.colors.card,
          },
        ]}
      >
        <View
          style={[
            styles.iconTileHalo,
            { backgroundColor: `${accentColor}${theme.isDark ? "16" : "12"}` },
          ]}
        />
        <View
          style={[
            styles.iconTileInner,
            categoryTileStyle,
            { backgroundColor: theme.colors.border, borderColor: theme.colors.border },
          ]}
        />
      </View>
    );
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
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[
          styles.scrollContent,
          { paddingBottom: layout.spacing.xl + 18 },
        ]}
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
        <View
          style={[
            styles.heroSection,
            { paddingHorizontal: layout.horizontalPadding },
          ]}
        >
          <LinearGradient
            colors={
              theme.isDark
                ? ["#111827", "#172033", "#0F172A"]
                : ["#FFF7EC", "#FFE8C9", "#FFD6AE"]
            }
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={[
              styles.heroPanel,
              {
                borderRadius: layout.isTablet ? 34 : 28,
                borderColor: theme.isDark
                  ? "rgba(255,255,255,0.08)"
                  : "rgba(255,255,255,0.72)",
              },
            ]}
          >
            <View
              style={[
                styles.heroOrb,
                styles.heroOrbTop,
                {
                  backgroundColor: `${theme.colors.primary}${
                    theme.isDark ? "24" : "18"
                  }`,
                },
              ]}
            />
            <View
              style={[
                styles.heroOrb,
                styles.heroOrbBottom,
                {
                  backgroundColor: `${theme.colors.secondary}${
                    theme.isDark ? "22" : "14"
                  }`,
                },
              ]}
            />

            <View style={styles.heroCopyBlock}>
              <Text
                style={[
                  styles.heroTitle,
                  {
                    color: theme.isDark ? "#F8FAFC" : "#111827",
                    direction:!isRTL ? 'ltr' : 'rtl'
                  },
                ]}
              >
                {t("discoverProducts")}
              </Text>
            </View>

            <View
              style={[
                styles.heroActionsGrid,
                {
                  gap: heroActionGap,
                  flexDirection: isRTL ? "row-reverse" : "row",
                },
              ]}
            >
              {heroActions.map((action) => (
                <Pressable
                  key={action.key}
                  style={({ pressed }) => [
                    styles.heroActionCard,
                    {
                      backgroundColor: action.background,
                      width: layout.isTablet
                        ? Math.min(
                            220,
                            (layout.width - layout.horizontalPadding * 2 - 72) / 2,
                          )
                        : "48%",
                    },
                    pressed && styles.heroActionCardPressed,
                  ]}
                  onPress={() => navigateToRoute(action.route)}
                >
                  <View
                    style={[
                      styles.heroActionIconWrap,
                      { backgroundColor: `${action.accent}18` },
                    ]}
                  >
                    <Ionicons
                      name={action.icon}
                      size={layout.isTablet ? 20 : 18}
                      color={action.accent}
                    />
                  </View>
                  <Text
                    numberOfLines={1}
                    style={[
                      styles.heroActionLabel,
                      { color: theme.isDark ? "#F8FAFC" : "#111827" },
                    ]}
                  >
                    {action.label}
                  </Text>
                  <Ionicons
                    name={isRTL ? "arrow-back" : "arrow-forward"}
                    size={14}
                    color={theme.isDark ? "#CBD5E1" : "#6B7280"}
                  />
                </Pressable>
              ))}
            </View>

            <View
              style={[
                styles.heroMetricsRow,
                {
                  flexDirection: isRTL ? "row-reverse" : "row",
                  gap: heroActionGap,
                },
              ]}
            >
              {heroMetrics.map((metric) => (
                <View
                  key={metric.key}
                  style={[
                    styles.heroMetricCard,
                    {
                      backgroundColor: theme.isDark
                        ? "rgba(255,255,255,0.05)"
                        : "rgba(255,255,255,0.58)",
                      borderColor: theme.isDark
                        ? "rgba(255,255,255,0.06)"
                        : "rgba(255,255,255,0.65)",
                    },
                  ]}
                >
                  <Text
                    style={[
                      styles.heroMetricValue,
                      { color: theme.isDark ? "#F8FAFC" : "#111827" },
                    ]}
                  >
                    {formatCompactNumber(metric.value)}
                  </Text>
                  <Text
                    numberOfLines={1}
                    style={[
                      styles.heroMetricLabel,
                      {
                        color: theme.isDark
                          ? "rgba(226,232,240,0.82)"
                          : "rgba(55,65,81,0.78)",
                      },
                    ]}
                  >
                    {metric.label}
                  </Text>
                </View>
              ))}
            </View>

            {((featuredLoading || productsLoading) ||
              heroPreviewProducts.length > 0) && (
              <View style={styles.heroPreviewBlock}>
                <View
                  style={[
                    styles.heroPreviewHeader,
                    { flexDirection: isRTL ? "row-reverse" : "row" },
                  ]}
                >
                  <Text
                    style={[
                      styles.heroPreviewTitle,
                      { color: theme.isDark ? "#F8FAFC" : "#111827" },
                    ]}
                  >
                    {t("featuredProducts")}
                  </Text>
                  <Pressable
                    style={({ pressed }) => [
                      styles.heroPreviewLink,
                      pressed && styles.heroSearchButtonPressed,
                    ]}
                    onPress={() => navigateToRoute("/products?is_important=1")}
                  >
                    <Text
                      style={[
                        styles.heroPreviewLinkText,
                        { color: theme.colors.primary },
                      ]}
                    >
                      {t("seeAll")}
                    </Text>
                  </Pressable>
                </View>
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={{
                    paddingRight: 4,
                    gap: 10,
                    flexDirection: isRTL ? "row-reverse" : "row",
                  }}
                >
                  {(featuredLoading || productsLoading) &&
                  heroPreviewProducts.length === 0
                    ? [1, 2, 3].map((item) => (
                        <View
                          key={`hero-skeleton-${item}`}
                          style={[
                            styles.heroPreviewCard,
                            {
                              width: heroPreviewCardWidth,
                              backgroundColor: theme.isDark
                                ? "rgba(255,255,255,0.06)"
                                : "rgba(255,255,255,0.5)",
                              borderColor: theme.isDark
                                ? "rgba(255,255,255,0.06)"
                                : "rgba(255,255,255,0.74)",
                            },
                          ]}
                        >
                          <View
                            style={[
                              styles.heroPreviewImage,
                              { backgroundColor: theme.colors.border },
                            ]}
                          />
                          <View style={styles.heroPreviewInfo}>
                            <View
                              style={[
                                styles.collectionSkeletonLine,
                                { width: "78%", backgroundColor: theme.colors.border },
                              ]}
                            />
                            <View
                              style={[
                                styles.collectionSkeletonLine,
                                { width: "46%", backgroundColor: theme.colors.border },
                              ]}
                            />
                          </View>
                        </View>
                      ))
                    : heroPreviewProducts.map((product) => (
                        <Pressable
                          key={`hero-product-${product.id}`}
                          style={({ pressed }) => [
                            styles.heroPreviewCard,
                            {
                              width: heroPreviewCardWidth,
                              backgroundColor: theme.isDark
                                ? "rgba(255,255,255,0.06)"
                                : "rgba(255,255,255,0.54)",
                              borderColor: theme.isDark
                                ? "rgba(255,255,255,0.06)"
                                : "rgba(255,255,255,0.74)",
                            },
                            pressed && styles.heroActionCardPressed,
                          ]}
                          onPress={() => openProduct(product.id)}
                        >
                          <Image
                            source={{
                              uri: getProductImageUrl(
                                product,
                                "https://via.placeholder.com/400",
                              ),
                            }}
                            style={styles.heroPreviewImage}
                            contentFit="cover"
                            transition={180}
                            cachePolicy="memory-disk"
                          />
                          <View style={styles.heroPreviewInfo}>
                            <Text
                              numberOfLines={2}
                              style={[
                                styles.heroPreviewName,
                                { color: theme.isDark ? "#F8FAFC" : "#111827" },
                              ]}
                            >
                              {getLocalizedText(product, "name")}
                            </Text>
                            <Text
                              style={[
                                styles.heroPreviewPrice,
                                { color: theme.colors.primary },
                              ]}
                            >
                              {isRTL
                                ? `${product.sell_price} دينار`
                                : `${product.sell_price} IQD`}
                            </Text>
                          </View>
                        </Pressable>
                      ))}
                </ScrollView>
              </View>
            )}
          </LinearGradient>
        </View>

        <View style={styles.mediaStack}>
          <BannerSlider />
          <DiscountProductSlider />
        </View>

        {/* Categories */}
        <SectionBanner
          type="categories"
          resizeMode="stretch"
          style={[styles.section, styles.categoriesSection]}
          route="/categories"
        >
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={[
              styles.iconRail,
              {
                paddingLeft: layout.horizontalPadding,
                paddingRight: layout.horizontalPadding,
                marginTop: sectionTopInset,
                gap: categoryGridGap,
                flexDirection: isRTL ? "row-reverse" : "row",
              },
            ]}
          >
            {categoriesLoading
              ? [1, 2, 3, 4].map((columnIndex) => (
                  <View
                    key={`category-column-skeleton-${columnIndex}`}
                    style={[styles.iconColumn, { gap: categoryGridGap }]}
                  >
                    {renderIconTileSkeleton(`${columnIndex}-top`, "category")}
                    {renderIconTileSkeleton(`${columnIndex}-bottom`, "category")}
                  </View>
                ))
              : categoryColumns.length > 0
                ? categoryColumns.map((column, columnIndex) => (
                    <View
                      key={`category-column-${columnIndex}`}
                      style={[styles.iconColumn, { gap: categoryGridGap }]}
                    >
                      {column.map((category) => renderIconTile(category, "category"))}
                      {column.length === 1 && (
                        <View style={{ width: iconColumnWidth, height: categoryCardSize }} />
                      )}
                    </View>
                  ))
                : (
                    <View
                      style={[
                        styles.collectionEmptyState,
                        {
                          backgroundColor: theme.colors.card,
                          borderColor: theme.colors.border,
                          width: Math.max(
                            220,
                            layout.width - layout.horizontalPadding * 2,
                          ),
                        },
                      ]}
                    >
                      <Ionicons
                        name="grid-outline"
                        size={22}
                        color={theme.colors.textSecondary}
                      />
                      <Text
                        style={[
                          styles.collectionEmptyText,
                          { color: theme.colors.textSecondary },
                        ]}
                      >
                        {t("noCategories")}
                      </Text>
                    </View>
                  )}
          </ScrollView>
        </SectionBanner>

        {/* Brands */}
        <SectionBanner
          type="brands"
          resizeMode="stretch"
          style={[styles.section, styles.brandsSection]}
          route="/brands"
        >
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={[
              styles.iconRail,
              {
                paddingLeft: layout.horizontalPadding,
                paddingRight: layout.horizontalPadding,
                marginTop: sectionTopInset,
                gap: categoryGridGap,
                flexDirection: isRTL ? "row-reverse" : "row",
              },
            ]}
          >
            {brandsLoading
              ? [1, 2, 3, 4].map((columnIndex) => (
                  <View
                    key={`brand-column-skeleton-${columnIndex}`}
                    style={[styles.iconColumn, { gap: categoryGridGap }]}
                  >
                    {renderIconTileSkeleton(`${columnIndex}-top`, "brand")}
                    {renderIconTileSkeleton(`${columnIndex}-bottom`, "brand")}
                  </View>
                ))
              : brandColumns.length > 0
                ? brandColumns.map((column, columnIndex) => (
                    <View
                      key={`brand-column-${columnIndex}`}
                      style={[styles.iconColumn, { gap: categoryGridGap }]}
                    >
                      {column.map((brand) => renderIconTile(brand, "brand"))}
                      {column.length === 1 && (
                        <View style={{ width: iconColumnWidth, height: categoryCardSize }} />
                      )}
                    </View>
                  ))
                : (
                    <View
                      style={[
                        styles.collectionEmptyState,
                        {
                          backgroundColor: theme.colors.card,
                          borderColor: theme.colors.border,
                          width: Math.max(
                            220,
                            layout.width - layout.horizontalPadding * 2,
                          ),
                        },
                      ]}
                    >
                      <Ionicons
                        name="storefront-outline"
                        size={22}
                        color={theme.colors.textSecondary}
                      />
                      <Text
                        style={[
                          styles.collectionEmptyText,
                          { color: theme.colors.textSecondary },
                        ]}
                      >
                        {t("noBrands")}
                      </Text>
                    </View>
                  )}
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
                  gap: layout.isTablet ? 16 : 12,
                  marginTop: sectionTopInset,
                }}
              >
                {recentProducts.map((product) => (
                  <Pressable
                    key={product.id}
                    style={({ pressed }) => [
                      styles.recentCard,
                      {
                        backgroundColor: theme.colors.card,
                        width: recentCardWidth,
                        borderRadius: layout.isTablet ? 16 : 12,
                      },
                      pressed && {
                        transform: [{ scale: 0.97 }],
                        opacity: 0.9,
                      },
                    ]}
                    onPress={() => openProduct(product.id)}
                  >
                    <View
                      style={[
                        styles.recentImage,
                        { height: recentImageHeight },
                      ]}
                    >
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
                            fontSize: layout.isTablet
                              ? 14
                              : layout.isSmallPhone
                                ? 12
                                : 13,
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
                              fontSize: layout.isTablet
                                ? 16
                                : layout.isSmallPhone
                                  ? 14
                                  : 15,
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
        {(featuredLoading || featuredProducts.length > 0) && (
          <SectionBanner
            type="special"
            resizeMode="none"
            style={[
              styles.section,
              { backgroundColor: "transparent", paddingTop: 10, paddingBottom: 0 },
            ]}
            route="/products?is_important=1"
          >
          <View
            style={[
              styles.productsGrid,
              {
                flexDirection: isRTL ? "row-reverse" : "row",
                paddingHorizontal: layout.horizontalPadding,
                marginTop: sectionTopInset,
                gap: layout.cardGap,
              },
            ]}
          >
            {featuredLoading && featuredProducts.length === 0 ? (
              <>
                {[1, 2, 3, 4].map((i) => (
                  <View
                    key={i}
                    style={[
                      styles.productCard,
                      {
                        backgroundColor: theme.colors.card,
                        width: featuredCardWidth,
                        borderColor: theme.colors.border,
                        borderWidth: StyleSheet.hairlineWidth,
                      },
                    ]}
                  >
                    <View
                      style={[
                        styles.productImage,
                        {
                          height: featuredImageHeight,
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
                            width: productActionButtonSize,
                            height: productActionButtonSize,
                            borderRadius: productActionButtonSize / 2,
                            backgroundColor: theme.colors.border,
                          }}
                        />
                      </View>
                    </View>
                  </View>
                ))}
              </>
            ) : featuredProducts.length > 0 ? (
              featuredProducts.map((product) => (
                <Pressable
                  key={product.id}
                  style={({ pressed }) => [
                    styles.productCard,
                    {
                      backgroundColor: theme.colors.card,
                      width: featuredCardWidth,
                    },
                    pressed && styles.productCardPressed,
                  ]}
                  onPress={() => openProduct(product.id)}
                >
                  {/* Image at top */}
                  <View
                    style={[
                      styles.productImage,
                      {
                        height: featuredImageHeight,
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
                          width: productActionButtonSize,
                          height: productActionButtonSize,
                          borderRadius: productActionButtonSize / 2,
                        },
                      ]}
                      onPress={(e) => {
                        e.stopPropagation();
                        handleToggleFavorite(product.id);
                      }}
                    >
                      <Heart
                        size={layout.isTablet ? 18 : 16}
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
                            minHeight: layout.isTablet ? 38 : 32,
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
                            width: productActionButtonSize,
                            height: productActionButtonSize,
                            borderRadius: productActionButtonSize / 2,
                          },
                        ]}
                        onPress={(e) => {
                          e.stopPropagation();
                          handleShareProduct(product.id, getLocalizedText(product, "name"));
                        }}
                      >
                        <Ionicons
                          name="share-outline"
                          size={productActionIconSize}
                          color="#fff"
                        />
                      </TouchableOpacity>
                    </View>
                  </View>
                </Pressable>
              ))
            ) : null}
          </View>
          </SectionBanner>
        )}
        {(loadingMore || (!hasMore && products.length > 0)) && (
          <View style={styles.listFooter}>
            {loadingMore ? (
              <Text style={{ color: theme.colors.textSecondary }}>
                {t("loadingMore")}...
              </Text>
            ) : (
              <Text style={{ color: theme.colors.textSecondary }}>
                {t("noMoreItems")}
              </Text>
            )}
          </View>
        )}
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
  scrollContent: {
    gap: 0,
  },
  heroSection: {
    marginTop: 8,
    marginBottom: 18,
  },
  heroPanel: {
    overflow: "hidden",
    borderWidth: 1,
    padding: 18,
    gap: 16,
    shadowColor: "#0F172A",
    shadowOpacity: 0.12,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: 14 },
    elevation: 5,
  },
  heroOrb: {
    position: "absolute",
    borderRadius: 999,
  },
  heroOrbTop: {
    width: 170,
    height: 170,
    top: -56,
    right: -40,
  },
  heroOrbBottom: {
    width: 190,
    height: 190,
    bottom: -108,
    left: -54,
  },
  heroCopyBlock: {
    gap: 10,
  },
  heroRibbon: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: 999,
    maxWidth: "100%",
  },
  heroRibbonText: {
    fontSize: 11,
  },
  heroTitle: {
    fontSize: 28,
    lineHeight: 34,
  },
  heroSubtitle: {
    fontSize: 13,
    lineHeight: 20,
  },
  heroSearchButton: {
    alignItems: "center",
    gap: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 20,
    borderWidth: 1,
  },
  heroSearchButtonPressed: {
    transform: [{ scale: 0.98 }],
    opacity: 0.92,
  },
  heroSearchIconWrap: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: "center",
    justifyContent: "center",
  },
  heroSearchText: {
    flex: 1,
    fontSize: 14,
  },
  heroActionsGrid: {
    flexWrap: "wrap",
  },
  heroActionCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingHorizontal: 12,
    paddingVertical: 12,
    borderRadius: 18,
  },
  heroActionCardPressed: {
    transform: [{ scale: 0.97 }],
    opacity: 0.9,
  },
  heroActionIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
  },
  heroActionLabel: {
    flex: 1,
    fontSize: 13,
  },
  heroMetricsRow: {
    justifyContent: "space-between",
  },
  heroMetricCard: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 10,
    borderRadius: 18,
    borderWidth: 1,
    gap: 2,
  },
  heroMetricValue: {
    fontSize: 18,
  },
  heroMetricLabel: {
    fontSize: 11,
  },
  heroPreviewBlock: {
    gap: 10,
  },
  heroPreviewHeader: {
    alignItems: "center",
    justifyContent: "space-between",
  },
  heroPreviewTitle: {
    fontSize: 15,
  },
  heroPreviewLink: {
    paddingVertical: 4,
  },
  heroPreviewLinkText: {
    fontSize: 12,
  },
  heroPreviewCard: {
    borderRadius: 18,
    overflow: "hidden",
    borderWidth: 1,
  },
  heroPreviewImage: {
    width: "100%",
    height: 118,
    backgroundColor: "#E5E7EB",
  },
  heroPreviewInfo: {
    padding: 10,
    gap: 6,
  },
  heroPreviewName: {
    fontSize: 12,
    lineHeight: 17,
    minHeight: 34,
  },
  heroPreviewPrice: {
    fontSize: 13,
  },
  mediaStack: {
    gap: 4,
  },
  iconRail: {
    alignItems: "flex-start",
  },
  iconColumn: {
    justifyContent: "flex-start",
  },
  iconTilePressable: {
    alignItems: "center",
  },
  iconTilePressed: {
    transform: [{ scale: 0.95 }],
    opacity: 0.88,
  },
  iconTile: {
    overflow: "hidden",
    borderWidth: 1,
    position: "relative",
    alignItems: "center",
    justifyContent: "center",
  },
  iconTileHalo: {
    position: "absolute",
    width: "74%",
    height: "74%",
    borderRadius: 999,
  },
  iconTileInner: {
    overflow: "hidden",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
  },
  iconTileImage: {
    width: "100%",
    height: "100%",
  },
  collectionSkeletonLine: {
    height: 10,
    borderRadius: 999,
  },
  collectionEmptyState: {
    minHeight: 120,
    borderWidth: 1,
    borderRadius: 24,
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingHorizontal: 16,
  },
  collectionEmptyText: {
    fontSize: 13,
    textAlign: "center",
  },
  listFooter: {
    paddingTop: 6,
    paddingBottom: 8,
    alignItems: "center",
    justifyContent: "center",
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
    paddingTop: 10,
    paddingBottom: 0,
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
    paddingTop: 10,
    paddingBottom: 0,
    marginBottom: 0,
    borderRadius: 0,
    backgroundColor: "#F5F5F5",
    position: "relative",
    overflow: "hidden",
  },
  recentSection: {
    paddingTop: 10,
    paddingBottom: 0,
    marginBottom: 0,
    backgroundColor: "#FFFFFF",
  },
  horizontalProductsSection: {
    paddingTop: 20,
    paddingBottom: 0,
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
  categoryShowcaseCard: {
    position: "relative",
    overflow: "hidden",
    borderWidth: 1,
    gap: 10,
    shadowColor: "#0F172A",
    shadowOpacity: 0.07,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 8 },
    elevation: 3,
  },
  categoryShowcaseCardPressed: {
    transform: [{ scale: 0.96 }],
    opacity: 0.9,
  },
  categoryGlowOrb: {
    position: "absolute",
    width: 96,
    height: 96,
    borderRadius: 999,
    top: -22,
    right: -16,
    opacity: 0.9,
  },
  categoryImageContainer2Row: {
    overflow: "hidden",
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#f0f4f8",
    borderColor: "#fff",
  },
  categoryFooterRow: {
    width: "100%",
    alignItems: "center",
    gap: 8,
  },
  categoryShowcaseLabel: {
    flex: 1,
    lineHeight: 16,
    letterSpacing: -0.1,
  },
  categoryArrowChip: {
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  categorySkeletonLine: {
    height: 10,
    borderRadius: 999,
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
    borderRadius: 12,
    overflow: "hidden",
    marginRight: 0,
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "#e9ecef",
  },
  recentImage: {
    width: "100%",
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
