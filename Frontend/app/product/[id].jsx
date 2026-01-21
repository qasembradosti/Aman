import { useMemo, useState, useRef, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Dimensions,
  Share,
  Image,
  FlatList,
  Animated,
  ActivityIndicator,
  TextInput,
  Pressable,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "../../utils/ThemeContext";
import { useRouter, useLocalSearchParams } from "expo-router";
import { useDispatch, useSelector } from "react-redux";
import { fetchProducts } from "../../store/slices/productsSlice";
import api from "../../services/apiService";
import InfoDialog from "../../components/InfoDialog";
import { useResponsiveLayout } from "../../utils/useResponsiveLayout";
import { useLanguage } from "../../utils/LanguageContext";
import {
  getProductImageUrl,
  getProductImageUrls,
} from "../../utils/productImages";

const { width: SCREEN_WIDTH } = Dimensions.get("window");

export default function ProductDetail() {
  const router = useRouter();
  const dispatch = useDispatch();
  const layout = useResponsiveLayout();
  const { t, isRTL, language } = useLanguage();
  const rowDirection = isRTL ? "row-reverse" : "row";
  const textAlign = isRTL ? "right" : "left";

  // Helper function to get localized text
  const getLocalizedText = (product, field) => {
    const localizedField = `${field}_${language}`;
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
  const { user } = useSelector((state) => state.auth);

  useEffect(() => {
    dispatch(fetchProducts({ limit: 100 }));
  }, [dispatch]);
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
  const scrollX = useRef(new Animated.Value(0)).current;
  const flatListRef = useRef(null);
  const [headerOpacity] = useState(new Animated.Value(0));
  const closeDialog = () =>
    setDialog({ visible: false, title: "", message: "" });

  // Get product from Redux store
  const dbProduct = useMemo(() => {
    return products.find((p) => String(p.id) === String(id));
  }, [products, id]);

  const product = useMemo(() => {
    if (dbProduct) {
      // Build specifications array dynamically
      const specs = [
        { label: "Brand", value: dbProduct.brand_name || "Premium Brand" },
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

      return {
        id: dbProduct.id,
        name: getLocalizedText(dbProduct, "name"),
        price: dbProduct.price,
        base_price: dbProduct.base_price,
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
  }, [dbProduct, id, language]);

  // Fetch reviews and rating summary
  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      if (!product?.id) return;
      setReviewsLoading(true);
      setReviewsError(null);
      try {
        const [summaryRes, reviewsRes] = await Promise.all([
          api.get(`/api/products/${product.id}/reviews/summary`),
          api.get(`/api/products/${product.id}/reviews?limit=10`),
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
        price: p.price,
        rating: p.rating || 4.0,
        image: getProductImageUrl(p, "https://via.placeholder.com/400"),
      }));
  }, [products, dbProduct, id]);

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

  if (productsLoading && !product) {
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
          onPress={() => router.push("/")}
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
      {/* Floating Header with Blur Effect */}
      <Animated.View
        style={[
          styles.floatingHeader,
          {
            backgroundColor: theme.colors.card + "E6",
            opacity: headerOpacity,
            flexDirection: rowDirection,
          },
        ]}
      >
        <TouchableOpacity
          style={[
            styles.floatingHeaderButton,
            {
              backgroundColor: theme.colors.background + "DD",
            },
          ]}
          onPress={() => router.push("/")}
        >
          <Ionicons
            name={isRTL ? "arrow-forward" : "arrow-back"}
            size={24}
            color={theme.colors.text}
          />
        </TouchableOpacity>
        <Text
          style={[styles.floatingHeaderTitle, { color: theme.colors.text }]}
          numberOfLines={1}
        >
          {product.name}
        </Text>
        <TouchableOpacity
          style={[
            styles.floatingHeaderButton,
            {
              backgroundColor: theme.colors.background + "DD",
            },
          ]}
          onPress={handleShare}
        >
          <Ionicons name="share-outline" size={24} color={theme.colors.text} />
        </TouchableOpacity>
      </Animated.View>

      {/* Transparent Header Buttons Over Image */}
      <SafeAreaView style={styles.headerOverlay}>
        <View
          style={[styles.headerOverlayContent, { flexDirection: rowDirection }]}
        >
          <TouchableOpacity
            style={[
              styles.overlayButton,
              { backgroundColor: "rgba(0,0,0,0.5)" },
            ]}
            onPress={() => router.push("/")}
          >
            <Ionicons
              name={isRTL ? "arrow-forward" : "arrow-back"}
              size={24}
              color="#fff"
            />
          </TouchableOpacity>
          <View
            style={[
              styles.overlayButtonsRight,
              { flexDirection: rowDirection },
            ]}
          >
            <TouchableOpacity
              style={[
                styles.overlayButton,
                { backgroundColor: "rgba(0,0,0,0.5)" },
              ]}
              onPress={handleShare}
            >
              <Ionicons name="share-outline" size={24} color="#fff" />
            </TouchableOpacity>
          </View>
        </View>
      </SafeAreaView>

      <ScrollView
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
        onScroll={Animated.event(
          [{ nativeEvent: { contentOffset: { y: headerOpacity } } }],
          {
            useNativeDriver: false,
            listener: (event) => {
              const offsetY = event.nativeEvent.contentOffset.y;
              headerOpacity.setValue(offsetY > 250 ? 1 : offsetY / 250);
            },
          },
        )}
        scrollEventThrottle={16}
      >
        {/* 1. Image Slider - Full Width */}
        <View style={styles.imageSliderContainer}>
          <FlatList
            ref={flatListRef}
            data={product.images}
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
            keyExtractor={(_, index) => `image-${index}`}
            renderItem={({ item }) => (
              <View style={[styles.imageSlide, { width: SCREEN_WIDTH }]}>
                {item ? (
                  <Image
                    source={{ uri: item }}
                    style={styles.slideImage}
                    resizeMode="cover"
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
              </View>
            )}
          />
          {/* Pagination Dots */}
          <View style={styles.pagination}>
            {product.images.map((_, index) => (
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
            <Text
              style={[
                styles.productName,
                {
                  color: theme.colors.text,
                  fontSize: layout.typography["2xl"],
                  marginBottom: layout.spacing.xs,
                  textAlign: isRTL ? "right" : "left",
                },
              ]}
            >
              {product.name}
            </Text>

            {/* Model Number */}
            <Text
              style={[
                styles.modelText,
                {
                  color: theme.colors.textSecondary,
                  fontSize: layout.typography.sm,
                  marginBottom: layout.spacing.md,
                  textAlign: isRTL ? "right" : "left",
                },
              ]}
            >
              {t("model") || "Model"}: {product.model}
            </Text>

            {/* Rating & Reviews */}
            <View
              style={[
                styles.ratingRow,
                {
                  marginBottom: layout.spacing.md,
                  flexDirection: rowDirection,
                },
              ]}
            >
              <View
                style={[
                  styles.ratingBadge,
                  {
                    backgroundColor: theme.colors.warning + "20" || "#FFB80020",
                    flexDirection: rowDirection,
                  },
                ]}
              >
                <Ionicons name="star" size={16} color="#FFB800" />
                <Text
                  style={[
                    styles.ratingValue,
                    { color: "#FFB800", fontSize: layout.typography.md },
                  ]}
                >
                  {displayedRating}
                </Text>
              </View>
              <Text
                style={[
                  styles.reviewsText,
                  {
                    color: theme.colors.textSecondary,
                    fontSize: layout.typography.sm,
                    marginLeft: isRTL ? 0 : layout.spacing.sm,
                    marginRight: isRTL ? layout.spacing.sm : 0,
                  },
                ]}
              >
                ({displayedReviewCount} {t("reviews") || "reviews"})
              </Text>
              {/* Stock Badge */}
              <View
                style={[
                  styles.stockBadge,
                  {
                    backgroundColor: product.inStock
                      ? theme.colors.success + "20" || "#34C75920"
                      : theme.colors.danger + "20" || "#ff444420",
                    marginLeft: isRTL ? 0 : layout.spacing.sm,
                    marginRight: isRTL ? layout.spacing.sm : 0,
                    flexDirection: rowDirection,
                  },
                ]}
              >
                <Ionicons
                  name={product.inStock ? "checkmark-circle" : "close-circle"}
                  size={16}
                  color={
                    product.inStock
                      ? theme.colors.success || "#34C759"
                      : theme.colors.danger || "#ff4444"
                  }
                />
                <Text
                  style={[
                    styles.stockBadgeText,
                    {
                      color: product.inStock
                        ? theme.colors.success || "#34C759"
                        : theme.colors.danger || "#ff4444",
                      fontSize: layout.typography.xs,
                    },
                  ]}
                >
                  {product.inStock
                    ? t("inStock") || "In Stock"
                    : t("outOfStock") || "Out of Stock"}
                </Text>
              </View>
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
                  {t("availableColors") || "Available Colors"}:
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

            {/* Price Section */}
            <View style={styles.priceSection}>
              <View
                style={[
                  styles.priceRow,
                  { flexDirection: isRTL ? "row-reverse" : "row" },
                ]}
              >
                <View
                  style={[
                    styles.priceDetails,
                    {
                      marginLeft: isRTL ? 0 : layout.spacing.md,
                      marginRight: isRTL ? layout.spacing.md : 0,
                    },
                  ]}
                >
                  <Text
                    style={[
                      styles.originalPrice,
                      {
                        color: "black",
                        fontSize: layout.typography.md,
                      },
                    ]}
                  >
                    ${product.base_price}
                  </Text>
                </View>
              </View>

              {/* Seller Bonus */}
              {typeof product.bonus === "number" && (
                <View
                  style={[
                    styles.bonusBadge,
                    {
                      backgroundColor:
                        theme.colors.success + "20" || "#34C75920",
                      borderRadius: layout.borderRadius.md,
                      marginTop: layout.spacing.sm,
                      flexDirection: rowDirection,
                    },
                  ]}
                >
                  <Ionicons
                    name="gift"
                    size={20}
                    color={theme.colors.success || "#34C759"}
                  />
                  <Text
                    style={[
                      styles.bonusText,
                      {
                        color: theme.colors.success || "#34C759",
                        fontSize: layout.typography.md,
                      },
                    ]}
                  >
                    {t("sellerBonus") || "Seller Bonus"}: ${product.bonus}
                  </Text>
                </View>
              )}
            </View>
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
              style={[styles.sectionHeader, { flexDirection: rowDirection }]}
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
                    marginLeft: isRTL ? 0 : layout.spacing.sm,
                    marginRight: isRTL ? layout.spacing.sm : 0,
                    direction: isRTL ? "rtl" : "ltr",
                  },
                ]}
              >
                {t("aboutProduct") || "About Product"}
              </Text>
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

          {/* 4. More Info (Features & Specifications) */}
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
              style={[styles.sectionHeader, { flexDirection: rowDirection }]}
            >
              <Ionicons
                name="list-circle"
                size={24}
                color={theme.colors.primary}
              />
              <Text
                style={[
                  styles.sectionTitle,
                  {
                    color: theme.colors.text,
                    fontSize: layout.typography.xl,
                    marginLeft: isRTL ? 0 : layout.spacing.sm,
                    marginRight: isRTL ? layout.spacing.sm : 0,
                  },
                ]}
              >
                {t("moreInfo") || "More Information"}
              </Text>
            </View>

            {/* Key Features */}
            <View style={[styles.subsection, { marginTop: layout.spacing.md }]}>
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
              style={[styles.sectionHeader, { flexDirection: rowDirection }]}
            >
              <Ionicons
                name="chatbubble-ellipses"
                size={24}
                color={theme.colors.primary}
              />
              <Text
                style={[
                  styles.sectionTitle,
                  {
                    color: theme.colors.text,
                    fontSize: layout.typography.xl,
                    marginLeft: isRTL ? 0 : layout.spacing.sm,
                    marginRight: isRTL ? layout.spacing.sm : 0,
                  },
                ]}
              >
                {t("reviews") || "Reviews"}
              </Text>
            </View>

            {/* Summary */}
            <View
              style={{
                flexDirection: isRTL ? "row-reverse" : "row",
                alignItems: "center",
                justifyContent: "space-between",
                marginTop: layout.spacing.md,
              }}
            >
              <View
                style={{
                  flexDirection: isRTL ? "row-reverse" : "row",
                  alignItems: "center",
                  gap: 8,
                }}
              >
                <Ionicons name="star" size={18} color="#FFB800" />
                <Text
                  style={{
                    color: theme.colors.text,
                    fontSize: layout.typography.lg,
                  }}
                >
                  {Number(reviewSummary.average || 0).toFixed(1)}
                </Text>
                <Text
                  style={{
                    color: theme.colors.textSecondary,
                    fontSize: layout.typography.sm,
                    textAlign,
                  }}
                >
                  ({reviewSummary.count} {t("reviews") || "reviews"})
                </Text>
              </View>
              <View
                style={{
                  flexDirection: rowDirection,
                  alignItems: "center",
                  gap: 6,
                }}
              >
                {[1, 2, 3, 4, 5].map((s) => (
                  <View
                    key={s}
                    style={{
                      flexDirection: rowDirection,
                      alignItems: "center",
                      gap: 4,
                    }}
                  >
                    <Text
                      style={{
                        color: theme.colors.textSecondary,
                        fontSize: layout.typography.xs,
                        textAlign,
                      }}
                    >
                      {s}
                    </Text>
                    <View
                      style={{
                        width: 90,
                        height: 6,
                        borderRadius: 3,
                        backgroundColor: theme.colors.border,
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
                          height: 6,
                          borderRadius: 3,
                          backgroundColor: "#FFB800",
                        }}
                      />
                    </View>
                  </View>
                ))}
              </View>
            </View>

            {/* Reviews list */}
            <View style={{ marginTop: layout.spacing.md }}>
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
                <Text style={{ color: theme.colors.textSecondary, textAlign }}>
                  {t("noReviewsYet") || "No reviews yet"}
                </Text>
              ) : (
                reviews.map((r) => (
                  <View
                    key={r.id}
                    style={{
                      borderTopWidth: StyleSheet.hairlineWidth,
                      borderTopColor: theme.colors.border,
                      paddingVertical: 12,
                    }}
                  >
                    <View
                      style={{
                        flexDirection: isRTL ? "row-reverse" : "row",
                        alignItems: "center",
                        gap: 6,
                      }}
                    >
                      {(() => {
                        const full = Math.floor(r.rating || 0);
                        const hasHalf = (r.rating || 0) - full >= 0.5;
                        const stars = [];
                        for (let i = 0; i < full; i++)
                          stars.push(
                            <Ionicons
                              key={`f-${i}`}
                              name="star"
                              size={14}
                              color="#FFB800"
                            />,
                          );
                        if (hasHalf)
                          stars.push(
                            <Ionicons
                              key="h"
                              name="star-half"
                              size={14}
                              color="#FFB800"
                            />,
                          );
                        const remaining = 5 - stars.length;
                        for (let i = 0; i < remaining; i++)
                          stars.push(
                            <Ionicons
                              key={`e-${i}`}
                              name="star-outline"
                              size={14}
                              color="#FFB800"
                            />,
                          );
                        return stars;
                      })()}
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
                          marginTop: 6,
                          textAlign,
                        }}
                      >
                        {r.comment}
                      </Text>
                    ) : null}
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
          {relatedProducts.length > 0 && (
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
                style={[styles.sectionHeader, { flexDirection: rowDirection }]}
              >
                <Ionicons name="apps" size={24} color={theme.colors.primary} />
                <Text
                  style={[
                    styles.sectionTitle,
                    {
                      color: theme.colors.text,
                      fontSize: layout.typography.xl,
                      marginLeft: isRTL ? 0 : layout.spacing.sm,
                      marginRight: isRTL ? layout.spacing.sm : 0,
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
                    onPress={() => router.push(`/product/${item.id}`)}
                  >
                    <View style={styles.relatedProductImage}>
                      <Image
                        source={{
                          uri: item.image || "https://via.placeholder.com/400",
                        }}
                        style={styles.relatedImage}
                        resizeMode="cover"
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
                        {item.name}
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
                          {item.price} IQD
                        </Text>
                      </View>
                    </View>
                  </Pressable>
                ))}
              </ScrollView>
            </View>
          )}
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
  // Floating header that appears on scroll
  floatingHeader: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    height: 90,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingTop: 40,
    zIndex: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "#e0e0e0",
  },
  floatingHeaderButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: "center",
    alignItems: "center",
  },
  floatingHeaderTitle: {
    flex: 1,
    fontSize: 18,
    direction: "rtl",
    textAlign: "center",
    marginHorizontal: 8,
  },
  // Transparent header overlay on image
  headerOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    zIndex: 5,
  },
  headerOverlayContent: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingTop: 8,
  },
  overlayButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: "center",
    alignItems: "center",
  },
  overlayButtonsRight: {
    flexDirection: "row",
    gap: 8,
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
  colorText: {
  },
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
  originalPrice: {
    textDecorationLine: "line-through",
  },
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
  },
  shareButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  shareButtonText: {
    color: "#fff",
  },
});
