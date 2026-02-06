import { useMemo, useState, useRef, useEffect } from "react";
import {
  View,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Dimensions,
  Share,
  FlatList,
  Animated,
  ActivityIndicator,
  TextInput,
  Pressable,
  Clipboard,
  Linking,
  Alert,
} from "react-native";
import { Image } from "expo-image";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "../../utils/ThemeContext";
import { useRouter, useLocalSearchParams } from "expo-router";
import { useDispatch, useSelector } from "react-redux";
import { fetchProducts } from "../../store/slices/productsSlice";
import { fetchBrands } from "../../store/slices/brandsSlice";
import api from "../../services/apiService";
import * as favoriteService from "../../services/favoriteService";
import InfoDialog from "../../components/InfoDialog";
import { useResponsiveLayout } from "../../utils/useResponsiveLayout";
import { useLanguage } from "../../utils/LanguageContext";
import {
  getProductImageUrl,
  getProductImageUrls,
} from "../../utils/productImages";
import { Text } from "../../components/ui/Text";
import VideoSlide from "../../components/VideoSlide";

const { width: SCREEN_WIDTH } = Dimensions.get("window");

export default function ProductDetail() {
  const router = useRouter();
  const dispatch = useDispatch();
  const layout = useResponsiveLayout();
  const { t, isRTL, locale } = useLanguage();
  const rowDirection = isRTL ? "row-reverse" : "row";
  const textAlign = isRTL ? "right" : "left";
  const navigationInProgress = useRef(false);

  // Helper function to get localized text
  const getLocalizedText = (product, field) => {
    // Ensure language has a default fallback
    const lang = locale;
    const localizedField = `${field}_${lang}`;
    return product[localizedField] || product[field] || "";
  };
  // Robust theme access: fall back to safe defaults if provider isn't mounted
  let theme;
  try {
    ({ theme } = useTheme());
  } catch (e) {
    theme = {
      colors: {
        primary: "#007AFF",
        success: "#34C759",
        text: "#1a1a1a",
        background: "#fff",
        card: "#fff",
        border: "#e0e0e0",
        textSecondary: "#666",
      },
    };
  }
  const { id } = useLocalSearchParams();
  const { items: products, loading: productsLoading } = useSelector(
    (state) => state.products,
  );
  const { items: brands, loading: brandsLoading } = useSelector(
    (state) => state.brands,
  );
  const { user } = useSelector((state) => state.auth);

  useEffect(() => {
    // Only fetch if products not already loaded
    if (products.length === 0) {
      dispatch(fetchProducts({ limit: 100 })).catch((error) => {
        console.log("Failed to fetch products:", error);
        // Silently fail - product might already be in cache
      });
    }
    // Fetch brands
    if (brands.length === 0) {
      dispatch(fetchBrands({ limit: 10 })).catch((error) => {
        console.log("Failed to fetch brands:", error);
      });
    }
  }, [dispatch, products.length, brands.length]);

  const [quantity, setQuantity] = useState(1);
  const [selectedImage, setSelectedImage] = useState(0);
  const [dialog, setDialog] = useState({
    visible: false,
    title: "",
    message: "",
  });
  const [reviews, setReviews] = useState([]);
  const [reviewsLoading, setReviewsLoading] = useState(false);
  const [reviewSummary, setReviewSummary] = useState({
    average: 0,
    count: 0,
    breakdown: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 },
  });
  const [reviewsError, setReviewsError] = useState(null);
  const [newRating, setNewRating] = useState(0);
  const [newComment, setNewComment] = useState("");
  const [submittingReview, setSubmittingReview] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [isFavorite, setIsFavorite] = useState(false);
  const [fetchedProduct, setFetchedProduct] = useState(null);
  const [fetchingProduct, setFetchingProduct] = useState(false);
  const scrollX = useRef(new Animated.Value(0)).current;
  const flatListRef = useRef(null);
  const closeDialog = () =>
    setDialog({ visible: false, title: "", message: "" });

  // Get product from Redux store
  const dbProduct = useMemo(() => {
    return products.find((p) => String(p.id) === String(id)) || fetchedProduct;
  }, [products, id, fetchedProduct]);

  // Fetch product directly if not in Redux store
  useEffect(() => {
    const fetchProductById = async () => {
      if (!dbProduct && id && !fetchingProduct) {
        try {
          setFetchingProduct(true);
          const response = await api.get(`/api/products/${id}`);
          setFetchedProduct(response.data);
        } catch (error) {
          console.error("Error fetching product:", error);
        } finally {
          setFetchingProduct(false);
        }
      }
    };
    fetchProductById();
  }, [id, dbProduct, fetchingProduct]);

  const product = useMemo(() => {
    if (dbProduct) {
      // Build specifications array dynamically
      const specs = [
        { label: "Brand", value: dbProduct.brand_name },
        {
          label: "Model",
          value:
            dbProduct.product_code ||
            "PRD-" + String(dbProduct.id).padStart(4, "0"),
        },
      ];

      // Add size if available
      if (dbProduct.size) {
        specs.push({ label: "Size", value: dbProduct.size });
      }

      // Add volume if available
      if (dbProduct.volume) {
        specs.push({ label: "Volume", value: dbProduct.volume });
      }

      // Add default specs
      specs.push(
        { label: "Weight", value: "500g" },
        { label: "Dimensions", value: "15x10x5 cm" },
      );

      // Calculate final price with discount logic
      const sell = Number(dbProduct.sell_price) || 0;
      const discount = Number(dbProduct.discount) || 0;
      let finalPrice = sell;
      
      if (discount > 0) {
        const type = (dbProduct.discount_type || "").toLowerCase();
        const isPercentage = type === "percentage" || type === "parsentage" || type === "percent";
        const isFixed = type === "fixed";
        
        if (isPercentage) {
          finalPrice = sell - (sell * discount / 100);
        } else if (isFixed) {
          finalPrice = sell - discount;
        }
      }
      finalPrice = Math.max(0, finalPrice);

      return {
        id: dbProduct.id,
        name: getLocalizedText(dbProduct, "name"),
        price: Math.round(finalPrice),
        original_sell_price: sell,
        discount: discount,
        discount_type: dbProduct.discount_type,
        base_price: dbProduct.base_price,
        commission_price: dbProduct.commission_price,
        originalPrice:
          dbProduct.original_price ||
          Math.round(dbProduct.price * 1.25 * 100) / 100,
        rating: dbProduct.rating ?? 4.2,
        reviews: dbProduct.reviews || 0,
        description:
          getLocalizedText(dbProduct, "description") ||
          "Great product with excellent quality.",
        model:
          dbProduct.product_code ||
          "PRD-" + String(dbProduct.id).padStart(4, "0"),
        features: dbProduct.features || [
          "High-quality materials",
          "Durable construction",
          "Easy to use",
          "Great value for money",
        ],
        specifications: specs,
        inStock: dbProduct.in_stock !== undefined ? dbProduct.in_stock : true,
        images: (() => {
          const urls = getProductImageUrls(dbProduct);
          return urls.length > 0 ? urls : [null];
        })(),
        media: (() => {
          const imageUrls = getProductImageUrls(dbProduct);
          const mediaItems = imageUrls.map((url) => ({
            type: "image",
            uri: url,
          }));

          // Add video if available
          if (dbProduct.video && dbProduct.video.url) {
            mediaItems.push({ type: "video", uri: dbProduct.video.url });
          }

          return mediaItems.length > 0
            ? mediaItems
            : [{ type: "image", uri: null }];
        })(),
        bonus: dbProduct.bonus,
        product_code: dbProduct.product_code,
        size: dbProduct.size,
        volume: dbProduct.volume,
        colors: (() => {
          try {
            return Array.isArray(dbProduct.colors)
              ? dbProduct.colors
              : typeof dbProduct.colors === "string"
                ? JSON.parse(dbProduct.colors)
                : null;
          } catch {
            return null;
          }
        })(),
      };
    }
    return null;
  }, [dbProduct, id, locale]);

  // Fetch reviews and rating summary
  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      if (!product?.id) return;
      setReviewsLoading(true);
      setReviewsError(null);
      try {
        const [summaryRes, reviewsRes, isFav] = await Promise.all([
          api.get(`/api/products/${product.id}/reviews/summary`),
          api.get(`/api/products/${product.id}/reviews?limit=10`),
          favoriteService.checkFavorite(product.id).catch(() => false),
        ]);
        if (cancelled) return;
        setReviewSummary(
          summaryRes.data || {
            average: 0,
            count: 0,
            breakdown: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 },
          },
        );
        setReviews((reviewsRes.data && reviewsRes.data.data) || []);
        setIsFavorite(isFav);
      } catch (err) {
        if (cancelled) return;
        setReviewsError(
          err?.response?.data?.message || "Failed to load reviews",
        );
      } finally {
        if (!cancelled) setReviewsLoading(false);
      }
    };
    load();
    return () => {
      cancelled = true;
    };
  }, [product?.id]);

  // Derived display rating/count using summary when available
  const displayedRating =
    Number(reviewSummary?.count) > 0
      ? Number(reviewSummary?.average || 0).toFixed(1)
      : (product?.rating ?? 0).toFixed(1);
  const displayedReviewCount = Number(
    reviewSummary?.count || product?.reviews || 0,
  );

  // Submit a new review
  const submitReview = async () => {
    if (!product?.id) return;
    if (!newRating || newRating < 1 || newRating > 5) {
      setReviewsError(t("invalidRating") || "Please select a rating 1-5");
      return;
    }
    setSubmittingReview(true);
    setReviewsError(null);
    try {
      await api.post(`/api/products/${product.id}/reviews`, {
        rating: newRating,
        comment: newComment?.trim() || null,
      });
      // Refresh summary and list
      const [summaryRes, reviewsRes] = await Promise.all([
        api.get(`/api/products/${product.id}/reviews/summary`),
        api.get(`/api/products/${product.id}/reviews?limit=10`),
      ]);
      setReviewSummary(
        summaryRes.data || {
          average: 0,
          count: 0,
          breakdown: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 },
        },
      );
      setReviews((reviewsRes.data && reviewsRes.data.data) || []);
      setNewRating(0);
      setNewComment("");
    } catch (err) {
      setReviewsError(
        err?.response?.data?.message || "Failed to submit review",
      );
    } finally {
      setSubmittingReview(false);
    }
  };

  // Copy product name or description
  const copyToClipboard = async (text, label) => {
    try {
      await Clipboard.setString(text);
    } catch (err) {
      setDialog({
        visible: true,
        title: t("error") || "Error",
        message: t("copyFailed") || "Failed to copy",
      });
    }
  };

  // Open media URL in browser for viewing/downloading
  const downloadMedia = async (uri, type) => {
    if (downloading) return;

    try {
      setDownloading(true);

      const canOpen = await Linking.canOpenURL(uri);
      if (canOpen) {
        await Linking.openURL(uri);
      } else {
        setDialog({
          visible: true,
          title: t("error") || "Error",
          message: t("cannotOpen") || "Cannot open this URL",
        });
      }
    } catch (err) {
      console.error("Open URL error:", err);
      setDialog({
        visible: true,
        title: t("error") || "Error",
        message: t("openFailed") || "Failed to open media",
      });
    } finally {
      setDownloading(false);
    }
  };

  // Related products from the same category
  const relatedProducts = useMemo(() => {
    if (!dbProduct) return [];
    return products
      .filter(
        (p) =>
          p.category_id === dbProduct.category_id &&
          String(p.id) !== String(id),
      )
      .slice(0, 5)
      .map((p) => ({
        id: p.id,
        name: p.title || p.name,
        name_en: p.name_en,
        name_ku: p.name_ku,
        name_ar: p.name_ar,
        sell_price: p.sell_price,
        rating: p.rating || 4.0,
        image: getProductImageUrl(p, "https://via.placeholder.com/400"),
      }));
  }, [products, dbProduct, id]);

  const toggleFavorite = async () => {
    if (!product?.id) return;

    try {
      const result = await favoriteService.toggleFavorite(product.id);
      setIsFavorite(result.isFavorite);
    } catch (error) {
      console.error("Favorite error:", error);
      setDialog({
        visible: true,
        title: t("error") || "Error",
        message:
          error?.response?.data?.message ||
          t("favoriteError") ||
          "Unable to update favorites",
      });
    }
  };

  const handleShare = async () => {
    try {
      const userId = user?.id || "unknown";
      const productId = product?.id || id;
      const checkoutUrl = `https://checkout.aman-store.com/checkout?userId=${userId}&productId=${productId}`;

      const result = await Share.share({
        message: `${product.name}\n\n${checkoutUrl}`,
        title: product.name,
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
      console.error("Share error:", error);
    }
  };

  // For sellers-only app: no cart/checkout; share link instead

  const increaseQuantity = () => setQuantity(quantity + 1);
  const decreaseQuantity = () => {
    if (quantity > 1) setQuantity(quantity - 1);
  };

  if ((productsLoading && !product) || fetchingProduct) {
    return (
      <View
        style={[
          styles.container,
          {
            backgroundColor: theme.colors.background,
            justifyContent: "center",
            alignItems: "center",
          },
        ]}
      >
        <ActivityIndicator size="large" color={theme.colors.primary} />
        <Text style={{ color: theme.colors.text, marginTop: 16 }}>
          Loading product...
        </Text>
      </View>
    );
  }

  if (!product) {
    return (
      <View
        style={[
          styles.container,
          {
            backgroundColor: theme.colors.background,
            justifyContent: "center",
            alignItems: "center",
            padding: 20,
          },
        ]}
      >
        <Ionicons
          name="alert-circle-outline"
          size={64}
          color={theme.colors.textSecondary}
        />
        <Text
          style={{
            color: theme.colors.text,
            marginTop: 16,
            fontSize: 18,
          }}
        >
          Product not found
        </Text>
        <TouchableOpacity
          style={{
            marginTop: 20,
            paddingHorizontal: 24,
            paddingVertical: 12,
            backgroundColor: theme.colors.primary,
            borderRadius: 8,
          }}
          onPress={() =>
            router.canGoBack?.()
              ? router.back()
              : router.replace("/(tabs)/home")
          }
        >
          <Text style={{ color: "#fff" }}>Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View
      style={[styles.container, { backgroundColor: theme.colors.background }]}
    >
      {/* Simple Header */}
      <SafeAreaView
        edges={["top"]}
        style={[
          styles.header,
          {
            backgroundColor: theme.colors.card,
            borderBottomColor: theme.colors.border,
          },
        ]}
      >
        <View style={[styles.headerContent, { flexDirection: rowDirection }]}>
          <TouchableOpacity
            style={styles.headerButton}
            onPress={() =>
              router.canGoBack?.()
                ? router.back()
                : router.replace("/(tabs)/home")
            }
          >
            <Ionicons
              name={isRTL ? "arrow-forward" : "arrow-back"}
              size={24}
              color={theme.colors.text}
            />
          </TouchableOpacity>
          <Text
            style={[styles.headerTitle, { color: theme.colors.text }]}
            numberOfLines={1}
          >
            {t("productDetails") || "Product Details"}
          </Text>
          <TouchableOpacity
            style={styles.headerButton}
            onPress={toggleFavorite}
          >
            <Ionicons
              name={isFavorite ? "heart" : "heart-outline"}
              size={24}
              color={isFavorite ? "#ff4444" : theme.colors.text}
            />
          </TouchableOpacity>
        </View>
      </SafeAreaView>

      <ScrollView
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
      >
        {/* 1. Image Slider - Full Width */}
        <View style={styles.imageSliderContainer}>
          <FlatList
            ref={flatListRef}
            data={product.media}
            horizontal
            pagingEnabled
            showsHorizontalScrollIndicator={false}
            onScroll={Animated.event(
              [{ nativeEvent: { contentOffset: { x: scrollX } } }],
              { useNativeDriver: false },
            )}
            onMomentumScrollEnd={(event) => {
              const index = Math.round(
                event.nativeEvent.contentOffset.x / SCREEN_WIDTH,
              );
              setSelectedImage(index);
            }}
            keyExtractor={(_, index) => `media-${index}`}
            renderItem={({ item }) => (
              <View style={[styles.imageSlide, { width: SCREEN_WIDTH }]}>
                {item.type === "video" ? (
                  <VideoSlide
                    uri={item.uri}
                    width={SCREEN_WIDTH}
                    height={400}
                  />
                ) : item.uri ? (
                  <Image
                    source={{ uri: item.uri }}
                    style={styles.slideImage}
                    contentFit="cover"
                    transition={200}
                    cachePolicy="memory-disk"
                  />
                ) : (
                  <View
                    style={[
                      styles.imagePlaceholder,
                      { backgroundColor: theme.colors.border },
                    ]}
                  >
                    <Ionicons
                      name="image-outline"
                      size={80}
                      color={theme.colors.textSecondary}
                    />
                  </View>
                )}

                {/* Download Button */}
                {item.uri && (
                  <TouchableOpacity
                    style={[
                      styles.downloadButton,
                      { backgroundColor: "rgba(0,0,0,0.6)" },
                    ]}
                    onPress={() => downloadMedia(item.uri, item.type)}
                    disabled={downloading}
                  >
                    {downloading ? (
                      <ActivityIndicator size="small" color="#fff" />
                    ) : (
                      <Ionicons
                        name="download-outline"
                        size={24}
                        color="#fff"
                      />
                    )}
                  </TouchableOpacity>
                )}
              </View>
            )}
          />
          {/* Pagination Dots */}
          <View style={styles.pagination}>
            {product.media.map((item, index) => (
              <View
                key={index}
                style={[
                  styles.paginationDot,
                  {
                    backgroundColor:
                      selectedImage === index
                        ? theme.colors.primary
                        : "rgba(255,255,255,0.5)",
                    width: selectedImage === index ? 24 : 8,
                  },
                ]}
              />
            ))}
          </View>
        </View>

        {/* Content Container */}
        <View
          style={[
            styles.contentContainer,
            { backgroundColor: theme.colors.background },
          ]}
        >
          {/* 2. Name, Price, and Model */}
          <View
            style={[
              styles.productBasicInfo,
              {
                backgroundColor: theme.colors.card,
                borderRadius: layout.borderRadius.lg,
                padding: layout.containerPadding,
                marginBottom: layout.spacing.md,
              },
            ]}
          >
            {/* Product Name */}
            <View
              style={[
                styles.nameWithCopy,
                { flexDirection: rowDirection, alignItems: "center", gap: 8 },
              ]}
            >
              <Text
                style={[
                  styles.productName,
                  {
                    color: theme.colors.text,
                    fontSize: layout.typography["2xl"],
                    direction: isRTL ? "rtl" : "ltr",
                    flex: 1,
                  },
                ]}
              >
                {getLocalizedText(product, "name")}
              </Text>
              <TouchableOpacity
                onPress={() =>
                  copyToClipboard(
                    getLocalizedText(product, "name"),
                    t("productName") || "Product name",
                  )
                }
                style={[
                  styles.copyButton,
                  { backgroundColor: theme.colors.primary + "20" },
                ]}
              >
                <Ionicons
                  name="copy-outline"
                  size={20}
                  color={theme.colors.primary}
                />
              </TouchableOpacity>
            </View>
            {/* Rating & Reviews */}
            <View
              style={[
                styles.ratingRow,
                {
                  marginBottom: layout.spacing.md,
                  flexDirection: "row",
                  direction: isRTL ? "rtl" : "ltr",
                  gap: 12,
                  flexWrap: "wrap",
                },
              ]}
            >
              {/* Rating Badge */}
              <View
                style={[
                  styles.ratingBadge,
                  {
                    backgroundColor: "#FFB800",
                    flexDirection: rowDirection,
                    paddingHorizontal: 12,
                    paddingVertical: 6,
                    borderRadius: 20,
                    elevation: 3,
                    shadowColor: "#FFB800",
                    shadowOffset: { width: 0, height: 2 },
                    shadowOpacity: 0.3,
                    shadowRadius: 4,
                  },
                ]}
              >
                <Ionicons name="star" size={16} color="#fff" />
                <Text
                  style={[
                    styles.ratingValue,
                    {
                      color: "#fff",
                      fontSize: layout.typography.md,
                      marginLeft: 4,
                    },
                  ]}
                >
                  {displayedRating}
                </Text>
              </View>

              {/* Stock Badge */}
              <View
                style={[
                  styles.stockBadge,
                  {
                    backgroundColor: product.inStock ? "#34C759" : "#ff4444",
                    flexDirection: rowDirection,
                    paddingHorizontal: 12,
                    paddingVertical: 6,
                    borderRadius: 20,
                    elevation: 3,
                    shadowColor: product.inStock ? "#34C759" : "#ff4444",
                    shadowOffset: { width: 0, height: 2 },
                    shadowOpacity: 0.3,
                    shadowRadius: 4,
                  },
                ]}
              >
                <Ionicons
                  name={product.inStock ? "checkmark-circle" : "close-circle"}
                  size={16}
                  color="#fff"
                />
                <Text
                  style={[
                    styles.stockBadgeText,
                    {
                      color: "#fff",
                      fontSize: layout.typography.sm,

                      marginLeft: 4,
                    },
                  ]}
                >
                  {product.inStock
                    ? t("inStock") || "In Stock"
                    : t("outOfStock")}
                </Text>
              </View>

              {/* Brand Badge (if available) */}
              {product.brand_name && (
                <View
                  style={[
                    styles.brandBadge,
                    {
                      backgroundColor: theme.colors.primary + "15",
                      borderWidth: 1,
                      borderColor: theme.colors.primary + "40",
                      flexDirection: rowDirection,
                      paddingHorizontal: 12,
                      paddingVertical: 6,
                      borderRadius: 20,
                    },
                  ]}
                >
                  <Ionicons
                    name="pricetag"
                    size={14}
                    color={theme.colors.primary}
                  />
                  <Text
                    style={{
                      color: theme.colors.primary,
                      fontSize: layout.typography.sm,

                      marginLeft: 4,
                    }}
                  >
                    {product.brand_name}
                  </Text>
                </View>
              )}
            </View>

            {/* Price Section - Redesigned */}
            <View style={[styles.priceContainer]}>
              <View
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  justifyContent: "space-between",
                }}
              >
                <View>
                  <Text
                    style={{
                      fontSize: 14,
                      color: theme.colors.textSecondary,
                      marginBottom: 4,
                    }}
                  >
                    {t("price")}
                  </Text>
                  <View
                    style={{
                      flexDirection: "row",
                      alignItems: "baseline",
                      gap: 8,
                    }}
                  >
                    <Text
                      style={{
                        fontSize: 32,

                        color: theme.colors.primary,
                        letterSpacing: -0.5,
                      }}
                    >
                      {product.price.toLocaleString()}
                    </Text>
                    <Text
                      style={{
                        fontSize: 18,

                        color: theme.colors.primary,
                      }}
                    >
                      {isRTL ? "دینار" : "IQD"}
                    </Text>
                  </View>
                  
                  {/* Original Price and Discount Badge */}
                  {product.discount > 0 && (
                    <View style={{ flexDirection: "row", alignItems: "center", gap: 8, marginTop: 8 }}>
                      {/* Original Price */}
                      <Text
                        style={{
                          fontSize: 18,
                          color: theme.colors.textSecondary,
                          textDecorationLine: "line-through",
                        }}
                      >
                        {product.original_sell_price.toLocaleString()} {isRTL ? "دینار" : "IQD"}
                      </Text>
                      
                      {/* Discount Badge */}
                      <View
                        style={{
                          backgroundColor: "#FF3B30",
                          paddingHorizontal: 12,
                          paddingVertical: 4,
                          borderRadius: 12,
                        }}
                      >
                        <Text
                          style={{
                            color: "#fff",
                            fontSize: 13,
                            fontWeight: "bold",
                          }}
                        >
                          {(product.discount_type || "").toLowerCase().includes("percent") 
                            ? `-${Math.round(product.discount)}%` 
                            : `-${product.discount.toLocaleString()} ${isRTL ? "د" : "IQD"}`}
                        </Text>
                      </View>
                    </View>
                  )}
                </View>
              </View>

              {/* Commission Price Badge */}
              {typeof product.commission_price === "number" &&
                product.commission_price > 0 && (
                  <View
                    style={{
                      marginTop: 16,
                      paddingTop: 16,
                      borderTopWidth: 1,
                      borderTopColor: theme.colors.border + "60",
                    }}
                  >
                    <View
                      style={{
                        flexDirection: "row",
                        alignItems: "center",
                        backgroundColor: "rgba(52, 199, 89, 0.1)",
                        borderWidth: 1,
                        borderColor: "rgba(52, 199, 89, 0.3)",
                        borderRadius: 16,
                        padding: 16,
                        gap: 12,
                      }}
                    >
                      <View
                        style={{
                          width: 48,
                          height: 48,
                          borderRadius: 24,
                          backgroundColor: "#34C759",
                          alignItems: "center",
                          justifyContent: "center",
                          elevation: 4,
                          shadowColor: "#34C759",
                          shadowOffset: { width: 0, height: 2 },
                          shadowOpacity: 0.3,
                          shadowRadius: 4,
                        }}
                      >
                        <Ionicons name="cash-outline" size={24} color="#fff" />
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text
                          style={{
                            fontSize: 13,
                            color: theme.colors.textSecondary,
                            marginBottom: 4,
                          }}
                        >
                          {t("commissionPrice") || "Commission Price"}
                        </Text>
                        <View
                          style={{
                            flexDirection: "row",
                            alignItems: "baseline",
                            gap: 6,
                          }}
                        >
                          <Text
                            style={{
                              color: "#34C759",
                              fontSize: 24,

                              letterSpacing: -0.5,
                            }}
                          >
                            {product.commission_price}
                          </Text>
                          <Text
                            style={{
                              color: "#34C759",
                              fontSize: 16,
                            }}
                          >
                            {isRTL ? "دینار" : "IQD"}
                          </Text>
                        </View>
                        <Text
                          style={{
                            fontSize: 11,
                            color: "#34C759",
                            marginTop: 2,
                          }}
                        >
                          {t("yourEarningsPerSale") || "Your earnings per sale"}
                        </Text>
                      </View>
                    </View>
                  </View>
                )}
            </View>

            {/* Colors Section (if available) */}
            {product.colors && product.colors.length > 0 && (
              <View
                style={[styles.colorsSection, { marginTop: layout.spacing.md }]}
              >
                <Text
                  style={[
                    styles.colorsLabel,
                    {
                      color: theme.colors.text,
                      fontSize: layout.typography.md,
                      marginBottom: layout.spacing.sm,
                      textAlign,
                    },
                  ]}
                >
                  {t("availableColors")}:
                </Text>
                <View
                  style={[
                    styles.colorsContainer,
                    { flexDirection: rowDirection, flexWrap: "wrap" },
                  ]}
                >
                  {product.colors.map((color, index) => (
                    <View
                      key={index}
                      style={[
                        styles.colorChip,
                        {
                          backgroundColor: theme.colors.primary + "15",
                          borderRadius: layout.borderRadius.md,
                          paddingHorizontal: layout.spacing.md,
                          paddingVertical: layout.spacing.xs,
                          marginRight: isRTL ? 0 : layout.spacing.sm,
                          marginLeft: isRTL ? layout.spacing.sm : 0,
                          marginBottom: layout.spacing.sm,
                        },
                      ]}
                    >
                      <Text
                        style={[
                          styles.colorText,
                          {
                            color: theme.colors.primary,
                            fontSize: layout.typography.sm,
                          },
                        ]}
                      >
                        {color}
                      </Text>
                    </View>
                  ))}
                </View>
              </View>
            )}
          </View>

          {/* 3. About Product (Description) */}
          <View
            style={[
              styles.section,
              {
                backgroundColor: theme.colors.card,
                borderRadius: layout.borderRadius.lg,
                padding: layout.containerPadding,
                marginBottom: layout.spacing.md,
              },
            ]}
          >
            <View
              style={[
                styles.sectionHeader,
                {
                  gap: layout.spacing.sm,
                  flexDirection: "row",
                  justifyContent: "space-between",
                  alignItems: "center",
                },
              ]}
            >
              <View
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  gap: layout.spacing.sm,
                }}
              >
                <Ionicons
                  name="information-circle"
                  size={24}
                  color={theme.colors.primary}
                />
                <Text
                  style={[
                    styles.sectionTitle,
                    {
                      color: theme.colors.text,
                      fontSize: layout.typography.xl,
                    },
                  ]}
                >
                  {t("aboutProduct")}
                </Text>
              </View>
              <TouchableOpacity
                onPress={() =>
                  copyToClipboard(
                    product.description,
                    t("description") || "Description",
                  )
                }
                style={[
                  styles.copyButton,
                  { backgroundColor: theme.colors.primary + "20" },
                ]}
              >
                <Ionicons
                  name="copy-outline"
                  size={20}
                  color={theme.colors.primary}
                />
              </TouchableOpacity>
            </View>
            <Text
              style={[
                styles.description,
                {
                  color: theme.colors.textSecondary,
                  fontSize: layout.typography.md,
                  lineHeight: layout.typography.md * 1.6,
                  marginTop: layout.spacing.sm,
                  direction: isRTL ? "rtl" : "ltr",
                },
              ]}
            >
              {product.description}
            </Text>
          </View>

          {/* 4. Key Features & Specifications */}
          <View
            style={[
              styles.section,
              {
                backgroundColor: theme.colors.card,
                borderRadius: layout.borderRadius.lg,
                padding: layout.containerPadding,
                marginBottom: layout.spacing.md,
              },
            ]}
          >
            {/* Key Features */}
            <View style={[styles.subsection, { marginTop: 0 }]}>
              <Text
                style={[
                  styles.subsectionTitle,
                  {
                    color: theme.colors.text,
                    fontSize: layout.typography.lg,
                    marginBottom: layout.spacing.sm,
                    textAlign,
                  },
                ]}
              >
                {t("keyFeatures") || "Key Features"}
              </Text>
              {product.features.map((feature, index) => (
                <View
                  key={index}
                  style={[
                    styles.featureItem,
                    {
                      flexDirection: isRTL ? "row-reverse" : "row",
                      marginBottom: layout.spacing.sm,
                    },
                  ]}
                >
                  <View
                    style={[
                      styles.featureBullet,
                      { backgroundColor: theme.colors.primary + "30" },
                    ]}
                  >
                    <Ionicons
                      name="checkmark"
                      size={14}
                      color={theme.colors.primary}
                    />
                  </View>
                  <Text
                    style={[
                      styles.featureText,
                      {
                        color: theme.colors.text,
                        fontSize: layout.typography.md,
                        marginLeft: isRTL ? 0 : layout.spacing.sm,
                        marginRight: isRTL ? layout.spacing.sm : 0,
                        flex: 1,
                        textAlign,
                      },
                    ]}
                  >
                    {feature}
                  </Text>
                </View>
              ))}
            </View>

            {/* Specifications */}
            <View style={[styles.subsection, { marginTop: layout.spacing.lg }]}>
              <Text
                style={[
                  styles.subsectionTitle,
                  {
                    color: theme.colors.text,
                    fontSize: layout.typography.lg,
                    marginBottom: layout.spacing.sm,
                    textAlign,
                  },
                ]}
              >
                {t("specifications") || "Specifications"}
              </Text>
              {product.specifications.map((spec, index) => (
                <View
                  key={index}
                  style={[
                    styles.specRow,
                    {
                      backgroundColor:
                        index % 2 === 0
                          ? theme.colors.background
                          : "transparent",
                      borderRadius: layout.borderRadius.sm,
                      padding: layout.spacing.sm,
                      flexDirection: isRTL ? "row-reverse" : "row",
                    },
                  ]}
                >
                  <Text
                    style={[
                      styles.specLabel,
                      {
                        color: theme.colors.textSecondary,
                        fontSize: layout.typography.sm,
                        textAlign,
                      },
                    ]}
                  >
                    {spec.label}
                  </Text>
                  <Text
                    style={[
                      styles.specValue,
                      {
                        color: theme.colors.text,
                        fontSize: layout.typography.sm,
                        textAlign: isRTL ? "left" : "right",
                      },
                    ]}
                  >
                    {spec.value}
                  </Text>
                </View>
              ))}
            </View>
          </View>

          {/* 4.5 Reviews & Ratings */}
          <View
            style={[
              styles.section,
              {
                backgroundColor: theme.colors.card,
                borderRadius: layout.borderRadius.lg,
                padding: layout.containerPadding,
                marginBottom: layout.spacing.md,
              },
            ]}
          >
            <View
              style={[
                styles.sectionHeader,
                { flexDirection: rowDirection, alignItems: "center" },
              ]}
            >
              <View
                style={{
                  flexDirection: rowDirection,
                  alignItems: "center",
                  gap: layout.spacing.sm,
                  flex: 1,
                }}
              >
                <Ionicons name="star" size={28} color="#FFB800" />
                <View>
                  <Text
                    style={[
                      styles.sectionTitle,
                      {
                        color: theme.colors.text,
                        fontSize: layout.typography.xl,
                      },
                    ]}
                  >
                    {t("reviews") || "Reviews"}
                  </Text>
                  <Text
                    style={{
                      color: theme.colors.textSecondary,
                      fontSize: layout.typography.sm,
                    }}
                  >
                    {reviewSummary.count} {t("reviews") || "reviews"}
                  </Text>
                </View>
              </View>
              <View style={{ alignItems: "center" }}>
                <Text
                  style={{
                    fontSize: 32,

                    color: theme.colors.text,
                  }}
                >
                  {Number(reviewSummary.average || 0).toFixed(1)}
                </Text>
                <View style={{ flexDirection: "row", gap: 2 }}>
                  {[1, 2, 3, 4, 5].map((s) => (
                    <Ionicons
                      key={s}
                      name={
                        s <= Math.floor(reviewSummary.average || 0)
                          ? "star"
                          : "star-outline"
                      }
                      size={12}
                      color="#FFB800"
                    />
                  ))}
                </View>
              </View>
            </View>

            {/* Rating Breakdown */}
            <View style={{ marginTop: layout.spacing.md, gap: 6 }}>
              {[5, 4, 3, 2, 1].map((s) => (
                <View
                  key={s}
                  style={{
                    flexDirection: rowDirection,
                    alignItems: "center",
                    gap: 8,
                  }}
                >
                  <Text
                    style={{
                      color: theme.colors.text,
                      fontSize: layout.typography.sm,
                      width: 12,
                      textAlign,
                    }}
                  >
                    {s}
                  </Text>
                  <Ionicons name="star" size={14} color="#FFB800" />
                  <View
                    style={{
                      flex: 1,
                      height: 8,
                      borderRadius: 4,
                      backgroundColor: theme.colors.border,
                      overflow: "hidden",
                    }}
                  >
                    <View
                      style={{
                        width: `${Math.min(
                          100,
                          Math.round(
                            ((reviewSummary.breakdown?.[s] || 0) /
                              Math.max(1, reviewSummary.count)) *
                              100,
                          ),
                        )}%`,
                        height: "100%",
                        backgroundColor: "#FFB800",
                      }}
                    />
                  </View>
                  <Text
                    style={{
                      color: theme.colors.textSecondary,
                      fontSize: layout.typography.xs,
                      width: 30,
                      textAlign: "right",
                    }}
                  >
                    {reviewSummary.breakdown?.[s] || 0}
                  </Text>
                </View>
              ))}
            </View>

            {/* Reviews list */}
            <View style={{ marginTop: layout.spacing.lg }}>
              {reviewsLoading ? (
                <View style={{ paddingVertical: 16, alignItems: "center" }}>
                  <ActivityIndicator
                    size="small"
                    color={theme.colors.primary}
                  />
                </View>
              ) : reviewsError ? (
                <Text
                  style={{ color: theme.colors.danger || "#ff4444", textAlign }}
                >
                  {reviewsError}
                </Text>
              ) : reviews.length === 0 ? (
                <View style={{ paddingVertical: 32, alignItems: "center" }}>
                  <Ionicons
                    name="chatbubble-outline"
                    size={48}
                    color={theme.colors.border}
                  />
                  <Text
                    style={{
                      color: theme.colors.textSecondary,
                      textAlign,
                      marginTop: 12,
                    }}
                  >
                    {t("noReviewsYet") || "No reviews yet"}
                  </Text>
                  <Text
                    style={{
                      color: theme.colors.textSecondary,
                      fontSize: layout.typography.xs,
                      marginTop: 4,
                    }}
                  >
                    Be the first to review this product
                  </Text>
                </View>
              ) : (
                reviews.map((r, index) => (
                  <View
                    key={r.id}
                    style={{
                      backgroundColor: theme.colors.background,
                      borderRadius: 12,
                      padding: 16,
                      marginBottom: 12,
                      borderWidth: 1,
                      borderColor: theme.colors.border,
                    }}
                  >
                    <View
                      style={{
                        flexDirection: isRTL ? "row-reverse" : "row",
                        alignItems: "flex-start",
                        gap: 12,
                      }}
                    >
                      {/* Avatar */}
                      <View
                        style={{
                          width: 40,
                          height: 40,
                          borderRadius: 20,
                          backgroundColor: theme.colors.primary + "20",
                          alignItems: "center",
                          justifyContent: "center",
                        }}
                      >
                        <Ionicons
                          name="person"
                          size={20}
                          color={theme.colors.primary}
                        />
                      </View>

                      {/* Review Content */}
                      <View style={{ flex: 1 }}>
                        <View
                          style={{
                            flexDirection: isRTL ? "row-reverse" : "row",
                            alignItems: "center",
                            justifyContent: "space-between",
                            marginBottom: 8,
                          }}
                        >
                          <View style={{ flexDirection: "row", gap: 3 }}>
                            {(() => {
                              const full = Math.floor(r.rating || 0);
                              const hasHalf = (r.rating || 0) - full >= 0.5;
                              const stars = [];
                              for (let i = 0; i < full; i++)
                                stars.push(
                                  <Ionicons
                                    key={`f-${i}`}
                                    name="star"
                                    size={16}
                                    color="#FFB800"
                                  />,
                                );
                              if (hasHalf)
                                stars.push(
                                  <Ionicons
                                    key="h"
                                    name="star-half"
                                    size={16}
                                    color="#FFB800"
                                  />,
                                );
                              const remaining = 5 - stars.length;
                              for (let i = 0; i < remaining; i++)
                                stars.push(
                                  <Ionicons
                                    key={`e-${i}`}
                                    name="star-outline"
                                    size={16}
                                    color="#FFB800"
                                  />,
                                );
                              return stars;
                            })()}
                          </View>
                          <Text
                            style={{
                              color: theme.colors.textSecondary,
                              fontSize: layout.typography.xs,
                            }}
                          >
                            {new Date(r.created_at).toLocaleDateString()}
                          </Text>
                        </View>
                        {r.comment ? (
                          <Text
                            style={{
                              color: theme.colors.text,
                              fontSize: layout.typography.md,
                              lineHeight: layout.typography.md * 1.5,
                              textAlign,
                            }}
                          >
                            {r.comment}
                          </Text>
                        ) : null}
                      </View>
                    </View>
                  </View>
                ))
              )}
            </View>

            {/* Submit review */}
            <View style={{ marginTop: layout.spacing.lg }}>
              <Text
                style={{
                  color: theme.colors.text,
                  fontSize: layout.typography.md,

                  marginBottom: layout.spacing.sm,
                  textAlign,
                }}
              >
                {t("writeReview") || "Write a Review"}
              </Text>
              <View
                style={{
                  flexDirection: isRTL ? "row-reverse" : "row",
                  alignItems: "center",
                  gap: 6,
                  marginBottom: layout.spacing.sm,
                }}
              >
                {[1, 2, 3, 4, 5].map((s) => (
                  <Pressable key={s} onPress={() => setNewRating(s)}>
                    <Ionicons
                      name={newRating >= s ? "star" : "star-outline"}
                      size={20}
                      color="#FFB800"
                    />
                  </Pressable>
                ))}
              </View>
              <TextInput
                value={newComment}
                onChangeText={setNewComment}
                placeholder={t("optionalComment") || "Optional comment"}
                placeholderTextColor={theme.colors.textSecondary}
                multiline
                style={{
                  borderWidth: 1,
                  borderColor: theme.colors.border,
                  borderRadius: 8,
                  padding: 10,
                  minHeight: 80,
                  color: theme.colors.text,
                  textAlign,
                  writingDirection: isRTL ? "rtl" : "ltr",
                  textAlignVertical: "top",
                }}
              />
              <TouchableOpacity
                style={{
                  marginTop: layout.spacing.sm,
                  backgroundColor: theme.colors.primary,
                  borderRadius: 8,
                  paddingVertical: 10,
                  alignItems: "center",
                  justifyContent: "center",
                  opacity: submittingReview ? 0.7 : 1,
                }}
                disabled={submittingReview}
                onPress={submitReview}
              >
                {submittingReview ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Text style={{ color: "#fff" }}>
                    {t("submitReview") || "Submit Review"}
                  </Text>
                )}
              </TouchableOpacity>
            </View>
          </View>

          {/* 5. Related Products */}
          {productsLoading && products.length === 0 ? (
            <View
              style={[
                styles.section,
                {
                  backgroundColor: theme.colors.card,
                  borderRadius: layout.borderRadius.lg,
                  padding: layout.containerPadding,
                  marginBottom: layout.spacing.xl,
                },
              ]}
            >
              <View
                style={[
                  styles.sectionHeader,
                  {
                    flexDirection: rowDirection,
                    alignItems: "center",
                    gap: layout.spacing.sm,
                  },
                ]}
              >
                <Ionicons name="apps" size={24} color={theme.colors.primary} />
                <Text
                  style={[
                    styles.sectionTitle,
                    {
                      color: theme.colors.text,
                      fontSize: layout.typography.xl,
                    },
                  ]}
                >
                  {t("relatedProducts") || "Related Products"}
                </Text>
              </View>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                style={{ marginTop: layout.spacing.md }}
                contentContainerStyle={{ paddingRight: layout.spacing.md }}
              >
                {[1, 2, 3].map((i) => (
                  <View
                    key={i}
                    style={[
                      styles.relatedProductCard,
                      {
                        backgroundColor: theme.colors.card,
                        borderRadius: 12,
                        marginRight: 12,
                        borderWidth: StyleSheet.hairlineWidth,
                        borderColor: theme.colors.border,
                      },
                    ]}
                  >
                    <View
                      style={[
                        styles.relatedProductImage,
                        {
                          backgroundColor: theme.colors.border + "40",
                        },
                      ]}
                    >
                      <ActivityIndicator
                        size="small"
                        color={theme.colors.primary}
                      />
                    </View>
                    <View style={styles.relatedProductInfo}>
                      <View
                        style={{
                          height: 32,
                          backgroundColor: theme.colors.border + "40",
                          borderRadius: 4,
                          marginBottom: 8,
                        }}
                      />
                      <View
                        style={{
                          height: 14,
                          width: 80,
                          backgroundColor: theme.colors.border + "40",
                          borderRadius: 4,
                          marginBottom: 8,
                        }}
                      />
                      <View
                        style={{
                          height: 18,
                          width: 60,
                          backgroundColor: theme.colors.border + "40",
                          borderRadius: 4,
                        }}
                      />
                    </View>
                  </View>
                ))}
              </ScrollView>
            </View>
          ) : relatedProducts.length > 0 ? (
            <View
              style={[
                styles.section,
                {
                  backgroundColor: theme.colors.card,
                  borderRadius: layout.borderRadius.lg,
                  padding: layout.containerPadding,
                  marginBottom: layout.spacing.xl,
                },
              ]}
            >
              <View
                style={[
                  styles.sectionHeader,
                  {
                    flexDirection: rowDirection,
                    alignItems: "center",
                    gap: layout.spacing.sm,
                  },
                ]}
              >
                <Ionicons name="apps" size={24} color={theme.colors.primary} />
                <Text
                  style={[
                    styles.sectionTitle,
                    {
                      color: theme.colors.text,
                      fontSize: layout.typography.xl,
                    },
                  ]}
                >
                  {t("relatedProducts") || "Related Products"}
                </Text>
              </View>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                style={{ marginTop: layout.spacing.md }}
                contentContainerStyle={{ paddingRight: layout.spacing.md }}
              >
                {relatedProducts.map((item) => (
                  <Pressable
                    key={item.id}
                    style={({ pressed }) => [
                      styles.relatedProductCard,
                      {
                        backgroundColor: theme.colors.card,
                        borderRadius: 12,
                        marginRight: 12,
                        borderWidth: StyleSheet.hairlineWidth,
                        borderColor: theme.colors.border,
                      },
                      pressed && {
                        transform: [{ translateY: -2 }, { scale: 0.98 }],
                      },
                    ]}
                    onPress={() => {
                      if (!navigationInProgress.current) {
                        navigationInProgress.current = true;
                        router.push(`/product/${item.id}`);
                        setTimeout(() => {
                          navigationInProgress.current = false;
                        }, 500);
                      }
                    }}
                  >
                    <View style={styles.relatedProductImage}>
                      <Image
                        source={{
                          uri: item.image || "https://via.placeholder.com/400",
                        }}
                        style={styles.relatedImage}
                        contentFit="cover"
                        transition={200}
                        cachePolicy="memory-disk"
                      />
                    </View>
                    <View style={styles.relatedProductInfo}>
                      <Text
                        style={[
                          styles.relatedProductName,
                          {
                            color: theme.colors.text,
                            fontSize: 13,
                            textAlign,
                          },
                        ]}
                        numberOfLines={2}
                      >
                        {getLocalizedText(item, "name") || item.name}
                      </Text>
                      <View
                        style={[
                          styles.relatedRatingRow,
                          { flexDirection: rowDirection },
                        ]}
                      >
                        <View
                          style={[
                            styles.relatedStarsRow,
                            { flexDirection: rowDirection },
                          ]}
                        >
                          {[1, 2, 3, 4, 5].map((star) => (
                            <Ionicons
                              key={star}
                              name={
                                star <= Math.floor(item.rating)
                                  ? "star"
                                  : "star-outline"
                              }
                              size={12}
                              color="#FFB800"
                            />
                          ))}
                        </View>
                        <Text
                          style={[
                            styles.relatedRatingText,
                            { color: theme.colors.textSecondary, textAlign },
                          ]}
                        >
                          {item.rating.toFixed(1)}
                        </Text>
                      </View>
                      <View style={styles.relatedBottomRow}>
                        <Text
                          style={[
                            styles.relatedProductPrice,
                            {
                              color: theme.colors.primary,
                              fontSize: 16,
                              textAlign,
                            },
                          ]}
                        >
                          {item.sell_price} {isRTL ? "دینار" : "IQD"}
                        </Text>
                      </View>
                    </View>
                  </Pressable>
                ))}
              </ScrollView>
            </View>
          ) : null}

          {/* 6. Brands Section */}
          {brandsLoading && brands.length === 0 ? (
            <View
              style={[
                styles.section,
                {
                  backgroundColor: theme.colors.card,
                  borderRadius: layout.borderRadius.lg,
                  padding: layout.containerPadding,
                  marginBottom: layout.spacing.xl,
                },
              ]}
            >
              <View
                style={[
                  styles.sectionHeader,
                  {
                    flexDirection: rowDirection,
                    alignItems: "center",
                    gap: layout.spacing.sm,
                  },
                ]}
              >
                <Ionicons
                  name="pricetag"
                  size={24}
                  color={theme.colors.primary}
                />
                <Text
                  style={[
                    styles.sectionTitle,
                    {
                      color: theme.colors.text,
                      fontSize: layout.typography.xl,
                    },
                  ]}
                >
                  {t("brands") || "Brands"}
                </Text>
              </View>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                style={{ marginTop: layout.spacing.md }}
                contentContainerStyle={{ gap: 12 }}
              >
                {[1, 2, 3, 4].map((i) => (
                  <View
                    key={i}
                    style={{
                      width: 100,
                      height: 100,
                      borderRadius: 12,
                      backgroundColor: theme.colors.border + "40",
                      alignItems: "center",
                      justifyContent: "center",
                      borderWidth: StyleSheet.hairlineWidth,
                      borderColor: theme.colors.border,
                    }}
                  >
                    <ActivityIndicator
                      size="small"
                      color={theme.colors.primary}
                    />
                  </View>
                ))}
              </ScrollView>
            </View>
          ) : brands.length > 0 ? (
            <View
              style={[
                styles.section,
                {
                  backgroundColor: theme.colors.card,
                  borderRadius: layout.borderRadius.lg,
                  padding: layout.containerPadding,
                  marginBottom: layout.spacing.xl,
                },
              ]}
            >
              <View
                style={[
                  styles.sectionHeader,
                  {
                    flexDirection: rowDirection,
                    alignItems: "center",
                    gap: layout.spacing.sm,
                  },
                ]}
              >
                <Ionicons
                  name="pricetag"
                  size={24}
                  color={theme.colors.primary}
                />
                <Text
                  style={[
                    styles.sectionTitle,
                    {
                      color: theme.colors.text,
                      fontSize: layout.typography.xl,
                    },
                  ]}
                >
                  {t("brands") || "Brands"}
                </Text>
              </View>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                style={{ marginTop: layout.spacing.md }}
                contentContainerStyle={{ gap: 12 }}
              >
                {brands.map((brand) => (
                  <Pressable
                    key={brand.id}
                    style={({ pressed }) => [
                      {
                        width: 100,
                        height: 100,
                        borderRadius: 12,
                        backgroundColor: theme.colors.background,
                        alignItems: "center",
                        justifyContent: "center",
                        borderWidth: StyleSheet.hairlineWidth,
                        borderColor: theme.colors.border,
                        padding: 8,
                      },
                      pressed && {
                        transform: [{ scale: 0.95 }],
                        borderColor: theme.colors.primary,
                      },
                    ]}
                    onPress={() => {
                      if (!navigationInProgress.current) {
                        navigationInProgress.current = true;
                        router.push(`/brand/${brand.id}`);
                        setTimeout(() => {
                          navigationInProgress.current = false;
                        }, 500);
                      }
                    }}
                  >
                    {brand.logo_url ? (
                      <Image
                        source={{ uri: brand.logo_url }}
                        style={{
                          width: "100%",
                          height: "100%",
                          borderRadius: 8,
                        }}
                        contentFit="contain"
                        transition={200}
                      />
                    ) : (
                      <View
                        style={{
                          width: "100%",
                          height: "100%",
                          alignItems: "center",
                          justifyContent: "center",
                        }}
                      >
                        <Text
                          style={{
                            color: theme.colors.text,
                            fontSize: 12,

                            textAlign: "center",
                          }}
                          numberOfLines={2}
                        >
                          {brand.name}
                        </Text>
                      </View>
                    )}
                  </Pressable>
                ))}
              </ScrollView>
            </View>
          ) : null}
        </View>
      </ScrollView>

      {/* Bottom Action Button */}
      <View
        style={[
          styles.bottomActions,
          {
            backgroundColor: theme.colors.card,
            borderTopColor: theme.colors.border,
            padding: layout.containerPadding,
          },
        ]}
      >
        <TouchableOpacity
          style={[
            styles.shareButton,
            {
              backgroundColor: theme.colors.primary,
              borderRadius: layout.borderRadius.lg,
              paddingVertical: layout.spacing.md,
              minHeight: layout.touchTargets.lg,
              flexDirection: rowDirection,
            },
          ]}
          onPress={handleShare}
        >
          <Ionicons name="share-social" size={20} color="#fff" />
          <Text
            style={[
              styles.shareButtonText,
              {
                fontSize: layout.typography.lg,
              },
            ]}
          >
            {t("shareProduct") || "Share Product"}
          </Text>
        </TouchableOpacity>
      </View>

      <InfoDialog
        visible={dialog.visible}
        title={dialog.title}
        message={dialog.message}
        onClose={closeDialog}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  // Simple Header
  header: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 2,
  },
  headerContent: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 12,
    height: 56,
  },
  headerButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: "center",
    alignItems: "center",
  },
  headerTitle: {
    flex: 1,
    fontSize: 18,
    textAlign: "center",
    marginHorizontal: 12,
  },
  scrollView: {
    flex: 1,
  },
  // Image Slider
  imageSliderContainer: {
    position: "relative",
    height: 400,
  },
  imageSlide: {
    height: 400,
    justifyContent: "center",
    alignItems: "center",
  },
  slideImage: {
    width: "100%",
    height: "100%",
  },
  imagePlaceholder: {
    width: "100%",
    height: "100%",
    justifyContent: "center",
    alignItems: "center",
  },
  pagination: {
    position: "absolute",
    bottom: 20,
    left: 0,
    right: 0,
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: 6,
  },
  paginationDot: {
    height: 8,
    borderRadius: 4,
    transition: "width 0.3s",
  },
  // Content Container
  contentContainer: {
    paddingHorizontal: 16,
    paddingTop: 16,
  },
  // Product Basic Info
  productBasicInfo: {},
  productName: {
    lineHeight: 32,
  },
  modelText: {},
  ratingRow: {
    alignItems: "center",
    gap: 8,
  },
  ratingBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  ratingValue: {},
  reviewsText: {},
  stockBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  stockBadgeText: {},
  colorsSection: {
    marginVertical: 8,
  },
  colorsLabel: {},
  colorsContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  colorChip: {
    borderWidth: 1,
    borderColor: "transparent",
  },
  colorText: {},
  priceSection: {
    marginTop: 4,
  },
  priceRow: {
    alignItems: "center",
    gap: 8,
  },
  currentPrice: {
    letterSpacing: -0.5,
  },
  priceDetails: {
    gap: 4,
    alignItems: "flex-start",
  },
  originalPrice: {},
  discountBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  discountText: {
    color: "#fff",
  },
  bonusBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  bonusText: {},
  // Sections
  section: {},
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
  },
  sectionTitle: {},
  description: {
    // direction is handled dynamically in component
  },
  subsection: {},
  subsectionTitle: {},
  featureItem: {
    alignItems: "flex-start",
  },
  featureBullet: {
    width: 22,
    height: 22,
    borderRadius: 11,
    justifyContent: "center",
    alignItems: "center",
    marginTop: 2,
  },
  featureText: {
    lineHeight: 22,
  },
  specRow: {
    justifyContent: "space-between",
  },
  specLabel: {
    flex: 1,
  },
  specValue: {
    flex: 1,
  },
  // Related Products
  relatedProductCard: {
    width: 140,
    overflow: "hidden",
    elevation: 0,
  },
  relatedProductImage: {
    width: "100%",
    height: 120,
    backgroundColor: "#f5f5f5",
    overflow: "hidden",
    justifyContent: "center",
    alignItems: "center",
    elevation: 0,
  },
  relatedImage: {
    width: "100%",
    height: "100%",
  },
  relatedProductInfo: {
    padding: 8,
    flex: 1,
    justifyContent: "space-between",
  },
  relatedProductName: {
    fontSize: 13,
    marginBottom: 4,
    minHeight: 32,
  },
  relatedRatingRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 6,
  },
  relatedStarsRow: {
    flexDirection: "row",
    gap: 1,
  },
  relatedRatingText: {
    fontSize: 11,
  },
  relatedBottomRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  relatedProductPrice: {},
  // Bottom Actions
  bottomActions: {
    borderTopWidth: StyleSheet.hairlineWidth,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 8,
  },
  shareButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 3,
    elevation: 2,
  },
  shareButtonText: {
    color: "#fff"
  },
  // Download Button
  downloadButton: {
    position: "absolute",
    bottom: 20,
    right: 20,
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: "center",
    alignItems: "center",
  },
  // Copy Button
  copyButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: "center",
    alignItems: "center",
  },
  nameWithCopy: {
    marginBottom: 8,
  },
  // Video Placeholder
  videoPlaceholderText: {
    textAlign: "center"
  },
  playButton: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 24,
  },
});
